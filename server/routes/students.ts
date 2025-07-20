import { Router } from "express";
import { addStudent, getAllStudents, getStudent, updateStudent } from "../controllers/students";

const router = Router();

router.route('/')
.post(addStudent)
.get(getAllStudents);

router.route('/:student_id')
.get(getStudent)
.patch(updateStudent);

export default router;