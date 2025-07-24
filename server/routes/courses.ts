import { Router } from "express";
import { addCourse, deleteCourse, getAllCourses, getCourse, updateCourse } from "../controllers/courses";

const router = Router();

router.route('/')
.get(getAllCourses)
.post(addCourse);

router.route('/:course_id')
.get(getCourse)
.patch(updateCourse)
.delete(deleteCourse);

export default router;