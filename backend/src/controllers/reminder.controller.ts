import { Request, Response } from "express";
import { ReminderService } from "../services/reminder.service";
import { Role } from "../generated/prisma/enums";
import { z } from "zod";

const createReminderSchema = z.object({
  agreementId: z.string().uuid(),
  targetTeam: z.nativeEnum(Role),
  message: z.string().optional(),
});

export const createReminder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!userId || userRole !== Role.LEGAL) {
      res.status(403).json({ error: "Only LEGAL team can send reminders." });
      return;
    }

    const { agreementId, targetTeam, message } = createReminderSchema.parse(req.body);

    if (targetTeam === Role.LEGAL) {
      res.status(400).json({ error: "Cannot send a reminder to the LEGAL team." });
      return;
    }

    const reminder = await ReminderService.createReminder(userId, agreementId, targetTeam, message);
    res.status(201).json(reminder);
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: error.errors });
    } else {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
};

export const getMyReminders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;

    if (!userRole) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const reminders = await ReminderService.getMyReminders(userRole);
    res.status(200).json(reminders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userRole = (req as any).user?.role;

    if (!id) {
      res.status(400).json({ error: "Reminder ID is required" });
      return;
    }

    if (!userRole) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const reminder = await ReminderService.markAsRead(id, userRole);
    res.status(200).json(reminder);
  } catch (error: any) {
    if (error.message === "Unauthorized to mark this reminder as read") {
      res.status(403).json({ error: error.message });
    } else if (error.message === "Reminder not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
};
