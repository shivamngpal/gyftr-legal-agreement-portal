import { prisma } from "../config/db";
import { CreateAgreementRequest, UpdateAgreementRequest } from "../utils/validation";
import { Role } from "../generated/prisma/enums";
import { S3Service } from "./s3.service";

export class AgreementService {
  static async uploadDraft(agreementId: string, fileBuffer: Buffer, fileName: string) {
    const agreement = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new Error("Agreement not found");

    // Upload to S3
    const fileUrl = await S3Service.uploadPdf(fileBuffer, fileName, agreementId);

    // Get max version
    const maxDraft = await prisma.draft.findFirst({
      where: { agreementId },
      orderBy: { version: "desc" },
    });

    const nextVersion = maxDraft ? maxDraft.version + 1 : 1;

    const draft = await prisma.draft.create({
      data: {
        agreementId,
        version: nextVersion,
        fileUrl,
      },
    });

    return draft;
  }
  static async createAgreement(data: CreateAgreementRequest) {
    const requiredRoles: Role[] = ["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"];
    const reviewStatusesData = requiredRoles.map((role) => ({
      team: role,
      status: "PENDING" as const,
    }));

    return await prisma.agreement.create({
      data: {
        clientName: data.clientName,
        type: data.type,
        startDate: new Date(data.startDate),
        documentUrl: data.documentUrl,
        legalSpocId: data.legalSpocId,
        financeSpocId: data.financeSpocId,
        businessSpocId: data.businessSpocId,
        complianceSpocId: data.complianceSpocId,
        reviewStatuses: {
          create: reviewStatusesData,
        },
      },
      include: {
        reviewStatuses: true,
      },
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
        reviewStatuses: {
          select: { team: true, status: true, updatedAt: true }
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
        reviewStatuses: true,
        drafts: { orderBy: { version: "desc" } },
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
    const reviewStatus = await prisma.reviewStatus.findUnique({
      where: { agreementId_team: { agreementId, team } },
    });

    if (!reviewStatus) throw new Error("Review status not found");

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
}
