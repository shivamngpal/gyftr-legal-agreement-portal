import { Request, Response } from "express";
import { SignOffService } from "../services/signoff.service";

export const createSignOff = async (req: Request, res: Response): Promise<void> => {
  try {
    const agreementId = req.params.id as string;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!agreementId) {
      res.status(400).json({ error: "Agreement ID is required" });
      return;
    }

    const signOff = await SignOffService.createSignOff(userId, agreementId);
    res.status(201).json(signOff);
  } catch (error: any) {
    if (error.name === "ConflictError") {
      res.status(409).json({ error: error.message });
    } else if (error.message === "Only LEGAL or BUSINESS roles can record a sign-off") {
      res.status(403).json({ error: error.message });
    } else if (error.message === "Agreement not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const getSignOffs = async (req: Request, res: Response): Promise<void> => {
  try {
    const agreementId = req.params.id as string;

    if (!agreementId) {
      res.status(400).json({ error: "Agreement ID is required" });
      return;
    }

    const signOffs = await SignOffService.getSignOffs(agreementId);
    res.status(200).json(signOffs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};
