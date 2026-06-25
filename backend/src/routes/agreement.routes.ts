import { Router } from "express";
import { 
  createAgreement, 
  getAllAgreements, 
  getAgreementById, 
  updateAgreement, 
  deleteAgreement, 
  updateReviewStatus 
} from "../controllers/agreement.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();

// Protect all routes with authentication
router.use(authenticate);

// Create Agreement -> LEGAL only
router.post("/", authorizeRoles("LEGAL"), createAgreement);

// Get All Agreements -> Any authenticated user
router.get("/", getAllAgreements);

// Get Agreement By ID -> Any authenticated user
router.get("/:id", getAgreementById);

// Update Review Status -> Any authenticated user
router.patch("/:id/review", updateReviewStatus);

// Update Agreement -> LEGAL only
router.put("/:id", authorizeRoles("LEGAL"), updateAgreement);

// Delete Agreement -> LEGAL only
router.delete("/:id", authorizeRoles("LEGAL"), deleteAgreement);

export default router;
