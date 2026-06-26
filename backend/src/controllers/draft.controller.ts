import { Request, Response } from "express";
import { z } from "zod";
import { draftIdSchema, updateClausesSchema } from "../utils/validation";
import { DraftService } from "../services/draft.service";

export const getClauses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = draftIdSchema.parse(req.params);
    const clauses = await DraftService.getClausesByDraftId(draftId);
    res.json(clauses);
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: error.errors });
      return;
    }
    if (error.message === "Draft not found") {
      res.status(404).json({ error: "Draft not found" });
      return;
    }
    console.error("Get Clauses Error:", error);
    res.status(500).json({ error: "Internal server error", message: error?.message });
  }
};

export const updateClauses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { draftId } = draftIdSchema.parse(req.params);
    const { clauses } = updateClausesSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const result = await DraftService.updateClauses(draftId, userId, clauses);
    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === "ZodError") {
      res.status(400).json({ error: "Validation error", details: error.errors });
      return;
    }
    if (error.message === "Draft not found" || error.message === "User not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("Update Clauses Error:", error);
    res.status(500).json({ error: "Internal server error", message: error?.message });
  }
};
