import { Request, Response } from "express";
import { createAgreementSchema, agreementIdSchema, updateAgreementSchema } from "../utils/validation";
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
