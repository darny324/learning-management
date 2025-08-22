import { Router } from "express";
import { addUser, getAllUsers, getUser, signIn } from "../controllers/users";

const router = Router();

router.route('/')
.post(addUser)
.get(getAllUsers);

router.route('/sign-in')
.patch(signIn);

router.route('/:user_id')
.get(getUser);

export default router;