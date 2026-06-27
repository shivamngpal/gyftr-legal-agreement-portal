import { Router } from "express";
import { getStats } from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/stats", authorizeRoles("LEGAL"), getStats);

export default router;
