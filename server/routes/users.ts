import { Router } from "express";
import { addUser, deleteUser, getAllUsers, getUser, updateUser } from "../controllers/users";

const router = Router();

router.route('/')
.post(addUser)
.get(getAllUsers);

router.route('/:user_id')
.get(getUser)
.patch(updateUser)
.delete(deleteUser);

export default router;