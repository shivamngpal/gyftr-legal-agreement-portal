import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await DashboardService.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
