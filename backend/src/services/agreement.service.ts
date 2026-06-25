import { prisma } from "../config/db";
import { CreateAgreementRequest, UpdateAgreementRequest } from "../utils/validation";
import { Role } from "../generated/prisma/enums";

export class AgreementService {
  static async createAgreement(data: CreateAgreementRequest) {
    // Requirements state: Automatically create four ReviewStatus records.
    // We will use a Prisma transaction to ensure the Agreement and its 4 default statuses are created atomically.
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

      const requiredRoles: Role[] = ["LEGAL", "FINANCE", "BUSINESS", "COMPLIANCE"];
      
      const reviewStatusesData = requiredRoles.map((role) => ({
        agreementId: agreement.id,
        team: role,
        status: "PENDING" as const, // Enum ReviewStatusEnum
      }));

      await tx.reviewStatus.createMany({
        data: reviewStatusesData,
      });

      // Fetch the created agreement along with its initialized review statuses
      return await tx.agreement.findUnique({
        where: { id: agreement.id },
        include: {
          reviewStatuses: true,
        },
      });
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
    return await prisma.agreement.findUnique({
      where: { id },
      include: {
        legalSpoc: { select: { id: true, name: true, email: true, role: true } },
        financeSpoc: { select: { id: true, name: true, email: true, role: true } },
        businessSpoc: { select: { id: true, name: true, email: true, role: true } },
        complianceSpoc: { select: { id: true, name: true, email: true, role: true } },
        reviewStatuses: true,
      },
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
}
