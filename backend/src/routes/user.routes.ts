import { Router } from "express";
import { getAllUsers } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getAllUsers);

export default router;
