import { Router } from "express";
import multer from "multer";
import { 
  createAgreement, 
  getAllAgreements, 
  getAgreementById, 
  updateAgreement, 
  deleteAgreement, 
  updateReviewStatus,
  uploadDraft,
  getRemarks,
  createRemark,
  getHistory
} from "../controllers/agreement.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Protect all routes with authentication
router.use(authenticate);

// Create Agreement -> LEGAL only
router.post("/", authorizeRoles("LEGAL"), createAgreement);

// Upload Draft -> LEGAL only
router.post("/:id/drafts", authorizeRoles("LEGAL"), upload.single("file"), uploadDraft);

// Get All Agreements -> Any authenticated user
router.get("/", getAllAgreements);

// Get Agreement By ID -> Any authenticated user
router.get("/:id", getAgreementById);

// Update Review Status -> Any authenticated user
router.patch("/:id/review", updateReviewStatus);

// Remarks -> Any authenticated user
router.get("/:id/remarks", getRemarks);
router.post("/:id/remarks", createRemark);

// History -> Any authenticated user
router.get("/:id/history", getHistory);

// Update Agreement -> LEGAL only
router.put("/:id", authorizeRoles("LEGAL"), updateAgreement);

// Delete Agreement -> LEGAL only
router.delete("/:id", authorizeRoles("LEGAL"), deleteAgreement);

export default router;
