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

export const updateAgreementSchema = createAgreementSchema.partial();

export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateAgreementRequest = z.infer<typeof createAgreementSchema>;
export type UpdateAgreementRequest = z.infer<typeof updateAgreementSchema>;
