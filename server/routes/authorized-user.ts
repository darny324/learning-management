import { Router } from "express";
import { changePassword, getAuthorizedUser, updateUser } from "../controllers/authorized-user";


const router = Router();

router.route('/')
.get(getAuthorizedUser)
.patch(updateUser)
.delete(updateUser);

router.route('/change-password')
.patch(changePassword);

export default router;