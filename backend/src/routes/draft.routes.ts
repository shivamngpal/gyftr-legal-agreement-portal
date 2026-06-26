import { Router } from "express";
import { getClauses, updateClauses } from "../controllers/draft.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Get all clauses for a draft
router.get("/:draftId/clauses", getClauses);

// Update clauses for a draft
router.patch("/:draftId/clauses", updateClauses);

export default router;
