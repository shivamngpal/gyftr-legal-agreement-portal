import { prisma } from "../config/db";
import { CreateAgreementRequest, UpdateAgreementRequest } from "../utils/validation";
import { Role } from "../generated/prisma/enums";
import { S3Service } from "./s3.service";
import { AIService } from "./ai.service";
import pdf from "pdf-parse";

export class AgreementService {
  static async uploadDraft(agreementId: string, fileBuffer: Buffer, fileName: string, actorId: string) {
    const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new Error("Agreement not found");

    // 1. Extract text from PDF
    let pdfText = "";
    try {
      const pdfData = await pdf(fileBuffer);
      pdfText = pdfData.text;
    } catch (err) {
      console.error("PDF Parse Error details:", err);
      throw new Error("Could not extract text from PDF");
    }

    if (!pdfText || pdfText.trim() === "") {
      throw new Error("Could not extract text from PDF. The document may be empty or scanned.");
    }

    // 2. Upload to S3
    const fileUrl = await S3Service.uploadPdf(fileBuffer, fileName, agreementId);

    // 3. Extract Clauses via AI
    const extractedClauses = await AIService.extractClauses(pdfText);

    return await prisma.$transaction(async (tx) => {
      // Get max version
      const maxDraft = await tx.draft.findFirst({
        where: { agreementId },
        orderBy: { version: "desc" },
      });

      const nextVersion = maxDraft ? maxDraft.version + 1 : 1;

      const requiredRoles: Role[] = ["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"];
      const reviewStatusesData = requiredRoles.map((role) => ({
        team: role,
        status: "PENDING" as const,
      }));

      const draft = await tx.draft.create({
        data: {
          agreementId,
          version: nextVersion,
          fileUrl,
          reviewStatuses: {
            create: reviewStatusesData,
          },
        },
      });

      // Insert Clauses
      if (extractedClauses.length > 0) {
        await tx.clause.createMany({
          data: extractedClauses.map((c) => ({
            draftId: draft.id,
            identifier: c.identifier || "Unknown",
            text: c.text || "",
            outcome: "PENDING",
            comments: null,
          })),
        });
      }

      // History Log: Draft Uploaded
      await tx.historyLog.create({
        data: {
          agreementId,
          actorId,
          action: "DRAFT_UPLOADED",
          details: `Uploaded Draft Version ${nextVersion}`,
        },
      });

      // History Log: AI Extraction
      await tx.historyLog.create({
        data: {
          agreementId,
          actorId,
          action: "CLAUSES_EXTRACTED",
          details: `AI extracted ${extractedClauses.length} clauses from Draft Version ${nextVersion}`,
        },
      });

      return draft;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });
  }

  static async createAgreement(data: CreateAgreementRequest, actorId: string) {
    return await prisma.$transaction(async (tx) => {
      const agreement = await tx.agreement.create({
        data: {
          clientName: data.clientName,
          type: data.type,
          startDate: new Date(data.startDate),
          documentUrl: data.documentUrl,
          legalSpocId: data.legalSpocId,
          financeSpocId: data.financeSpocId,
          businessSpocId: data.businessSpocId,
          complianceSpocId: data.complianceSpocId,
        },
      });

      await tx.historyLog.create({
        data: {
          agreementId: agreement.id,
          actorId,
          action: "AGREEMENT_CREATED",
          details: `Created Agreement for ${data.clientName}`,
        },
      });

      return agreement;
    });
  }

  static async getAllAgreements() {
    return await prisma.agreement.findMany({
      select: {
        id: true,
        clientName: true,
        type: true,
        status: true,
        startDate: true,
        updatedAt: true,
        legalSpoc: { select: { id: true, name: true, email: true } },
        financeSpoc: { select: { id: true, name: true, email: true } },
        businessSpoc: { select: { id: true, name: true, email: true } },
        complianceSpoc: { select: { id: true, name: true, email: true } },
        drafts: {
          orderBy: { version: "desc" },
          include: {
            reviewStatuses: {
              select: { team: true, status: true, updatedAt: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  static async getAgreementById(id: string) {
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        legalSpoc: { select: { id: true, name: true, email: true, role: true } },
        financeSpoc: { select: { id: true, name: true, email: true, role: true } },
        businessSpoc: { select: { id: true, name: true, email: true, role: true } },
        complianceSpoc: { select: { id: true, name: true, email: true, role: true } },
        drafts: { 
          orderBy: { version: "desc" },
          include: {
            reviewStatuses: true
          }
        },
      },
    });

    if (!agreement) return null;

    // Generate presigned URLs for secure viewing
    const signedDrafts = await Promise.all(
      agreement.drafts.map(async (draft) => ({
        ...draft,
        fileUrl: await S3Service.getPresignedUrl(draft.fileUrl),
      }))
    );

    return { ...agreement, drafts: signedDrafts };
  }

  static async updateReviewStatus(agreementId: string, team: Role, newStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED", actorId: string) {
    const maxDraft = await prisma.draft.findFirst({
      where: { agreementId },
      orderBy: { version: "desc" },
    });

    if (!maxDraft) throw new Error("No drafts found for this agreement");

    const reviewStatus = await prisma.reviewStatus.findUnique({
      where: { draftId_team: { draftId: maxDraft.id, team } },
    });

    if (!reviewStatus) throw new Error("Review status not found for the current draft");

    const validTransitions: Record<string, string[]> = {
      PENDING: ["UNDER_REVIEW"],
      UNDER_REVIEW: ["APPROVED", "REJECTED"],
      APPROVED: [],
      REJECTED: [],
    };

    if (!validTransitions[reviewStatus.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${reviewStatus.status} to ${newStatus}`);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.reviewStatus.update({
        where: { id: reviewStatus.id },
        data: { status: newStatus },
      });

      await tx.historyLog.create({
        data: {
          agreementId,
          actorId,
          action: "STATUS_CHANGE",
          details: `${team} status changed from ${reviewStatus.status} to ${newStatus}`,
        },
      });

      return updated;
    });
  }

  static async updateAgreement(id: string, data: UpdateAgreementRequest) {
    const updateData: any = { ...data };
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    return await prisma.agreement.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteAgreement(id: string) {
    return await prisma.agreement.delete({
      where: { id },
    });
  }

  static async getRemarks(agreementId: string) {
    return await prisma.remark.findMany({
      where: { agreementId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }

  static async createRemark(agreementId: string, authorId: string, message: string) {
    const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new Error("Agreement not found");

    return await prisma.$transaction(async (tx) => {
      const remark = await tx.remark.create({
        data: {
          agreementId,
          authorId,
          message,
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.historyLog.create({
        data: {
          agreementId,
          actorId: authorId,
          action: "REMARK_ADDED",
          details: `Added a remark: "${message.length > 50 ? message.substring(0, 50) + "..." : message}"`,
        },
      });

      return remark;
    });
  }

  static async getHistory(agreementId: string) {
    return await prisma.historyLog.findMany({
      where: { agreementId },
      orderBy: { timestamp: "desc" },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
