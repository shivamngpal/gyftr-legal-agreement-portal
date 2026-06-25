import { Request, Response } from "express";
import { createAgreementSchema, agreementIdSchema, updateAgreementSchema, updateReviewStatusSchema } from "../utils/validation";
import { AgreementService } from "../services/agreement.service";
import { z } from "zod";

export const createAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createAgreementSchema.parse(req.body);
    const result = await AgreementService.createAgreement(data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError<any>;
      res.status(400).json({ error: "Validation error", details: (error as any).errors });
      return;
    }
    console.error("Create Agreement Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllAgreements = async (_req: Request, res: Response): Promise<void> => {
  try {
    const results = await AgreementService.getAllAgreements();
    res.json(results);
  } catch (error) {
    console.error("Get All Agreements Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAgreementById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = agreementIdSchema.parse(req.params);
    const agreement = await AgreementService.getAgreementById(id);

    if (!agreement) {
      res.status(404).json({ error: "Agreement not found" });
      return;
    }

    res.json(agreement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError<any>;
      res.status(400).json({ error: "Validation error", details: (error as any).errors });
      return;
    }
    console.error("Get Agreement By ID Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateReviewStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = agreementIdSchema.parse(req.params);
    const { status } = updateReviewStatusSchema.parse(req.body);
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.userId;

    if (!userRole || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await AgreementService.updateReviewStatus(id, userRole as any, status, userId);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: error.errors });
      return;
    }
    if (error.message && error.message.includes("Invalid status transition")) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.message === "Review status not found") {
      res.status(404).json({ error: "Review status not found for this team." });
      return;
    }
    console.error("Update Review Status Error:", error);
    res.status(500).json({ error: "Internal server error", message: error?.message });
  }
};

export const updateAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = agreementIdSchema.parse(req.params);
    const data = updateAgreementSchema.parse(req.body);

    const updated = await AgreementService.updateAgreement(id, data);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: (error as any).errors });
      return;
    }
    if (error.code === "P2025") {
      // Prisma RecordNotFound error code
      res.status(404).json({ error: "Agreement not found" });
      return;
    }
    console.error("Update Agreement Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteAgreement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = agreementIdSchema.parse(req.params);

    await AgreementService.deleteAgreement(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Validation error", details: (error as any).errors });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: "Agreement not found" });
      return;
    }
    console.error("Delete Agreement Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
