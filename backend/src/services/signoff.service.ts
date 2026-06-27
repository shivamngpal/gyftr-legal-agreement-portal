import { prisma } from "../config/db";
import { Role } from "../generated/prisma/enums";
import { AgreementService } from "./agreement.service";

export class SignOffService {
  static async createSignOff(signatoryId: string, agreementId: string) {
    const user = await prisma.user.findUnique({ where: { id: signatoryId } });
    if (!user) throw new Error("User not found");

    if (user.role !== Role.LEGAL && user.role !== Role.BUSINESS) {
      throw new Error("Only LEGAL or BUSINESS roles can record a sign-off");
    }

    const agreement = await prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { drafts: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!agreement) throw new Error("Agreement not found");

    const latestDraft = agreement.drafts[0];
    if (!latestDraft) throw new Error("No draft exists for this agreement");

    const existingSignOff = await prisma.signOff.findUnique({
      where: {
        agreementId_signatoryId: {
          agreementId,
          signatoryId,
        },
      },
    });

    if (existingSignOff) {
      const error = new Error("You have already signed this agreement");
      error.name = "ConflictError";
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create SignOff record
      const signOff = await tx.signOff.create({
        data: {
          agreementId,
          signatoryId,
        },
        include: {
          signatory: { select: { name: true, role: true } },
        },
      });

      // 2. Update signatory's team ReviewStatus to APPROVED if not already
      const reviewStatus = await tx.reviewStatus.findUnique({
        where: { draftId_team: { draftId: latestDraft.id, team: user.role } },
      });

      if (reviewStatus && reviewStatus.status !== "APPROVED") {
        await tx.reviewStatus.update({
          where: { id: reviewStatus.id },
          data: { status: "APPROVED" },
        });

        await tx.historyLog.create({
          data: {
            agreementId,
            draftId: latestDraft.id,
            actorId: signatoryId,
            action: "STATUS_CHANGE",
            details: `${user.role} status automatically changed to APPROVED via sign-off`,
          },
        });
      }

      // 3. Create HistoryLog for the SignOff
      await tx.historyLog.create({
        data: {
          agreementId,
          draftId: latestDraft.id,
          actorId: signatoryId,
          action: "SIGNED_OFF",
          details: `${user.name} (${user.role}) recorded a digital sign-off`,
        },
      });

      // 4. Recompute overall status
      await AgreementService.recomputeAgreementStatus(tx, agreementId, signatoryId, latestDraft.id);

      return signOff;
    });
  }

  static async getSignOffs(agreementId: string) {
    return prisma.signOff.findMany({
      where: { agreementId },
      orderBy: { timestamp: "asc" },
      include: {
        signatory: { select: { name: true, role: true } },
      },
    });
  }
}
