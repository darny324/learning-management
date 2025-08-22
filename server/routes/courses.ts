import { Router } from "express";
import { addCourse, deleteCourse, getAllCourses, getCourse, updateCourse } from "../controllers/courses";
import authorizationMiddleware from "../middleware/authorization";

const router = Router();

router.route('/')
.get(getAllCourses)

router.route('/:course_id')
.get(getCourse);

router.use(authorizationMiddleware);

router.route('/')
.post(addCourse);

router.route('/:course_id')
.patch(updateCourse)
.delete(deleteCourse);

export default router;