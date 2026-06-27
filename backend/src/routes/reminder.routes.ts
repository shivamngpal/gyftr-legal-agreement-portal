import { Router } from "express";
import { createReminder, getMyReminders, markAsRead } from "../controllers/reminder.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All reminder routes require authentication
router.use(authenticate);

router.post("/", createReminder);
router.get("/my", getMyReminders);
router.patch("/:id/read", markAsRead);

export default router;
