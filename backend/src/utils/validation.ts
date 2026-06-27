import { z } from "zod";
import { AgreementType } from "../generated/prisma/enums";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createAgreementSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  type: z.nativeEnum(AgreementType, {
    error: "Invalid agreement type",
  }),
  startDate: z.string().datetime({ message: "Invalid ISO datetime for start date" }),
  documentUrl: z.string().url("Invalid document URL").optional(),
  legalSpocId: z.string().uuid("Invalid SPOC UUID").optional(),
  financeSpocId: z.string().uuid("Invalid SPOC UUID").optional(),
  businessSpocId: z.string().uuid("Invalid SPOC UUID").optional(),
  complianceSpocId: z.string().uuid("Invalid SPOC UUID").optional(),
});

export const agreementIdSchema = z.object({
  id: z.string().uuid("Invalid agreement ID format"),
});

export const draftIdSchema = z.object({
  draftId: z.string().uuid("Invalid draft ID format"),
});

export const updateAgreementSchema = createAgreementSchema.partial();

export const updateReviewStatusSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"], {
    error: "Invalid review status",
  }),
  draftId: z.string().uuid().optional(),
});

export const createRemarkSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  draftId: z.string().uuid("Invalid draft ID").optional(),
});

export const updateClausesSchema = z.object({
  clauses: z.array(
    z.object({
      id: z.string().uuid("Invalid clause ID"),
      outcome: z.enum(["PENDING", "ACCEPTED", "PARTIAL", "HELD"], {
        error: "Invalid clause outcome",
      }),
      comments: z.string().nullable().optional(),
    })
  ).min(1, "At least one clause must be updated"),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateAgreementRequest = z.infer<typeof createAgreementSchema>;
export type UpdateAgreementRequest = z.infer<typeof updateAgreementSchema>;
