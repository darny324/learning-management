import { Router } from "express";
import { addEnrollment, deleteEnrollments, getEnrollments } from "../controllers/enrollments";

const router = Router();

router.route('/')
.post(addEnrollment)
.get(getEnrollments)
.delete(deleteEnrollments);

export default router;