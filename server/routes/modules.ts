import { Router } from "express";
import { addModule, deleteModule, getAllModules, getModule, updateModule } from "../controllers/modules";

const router = Router({mergeParams: true});

router.route('/')
.get(getAllModules)
.post(addModule);

router.route('/:module_id')
.get(getModule)
.patch(updateModule)
.delete(deleteModule);

export default router;