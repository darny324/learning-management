import { Router } from "express";
import { addModule, addResource, addTest, deleteModule, deleteResource, deleteTest, getAllModules, getModule, getTest, updateModule, updateResource, updateTest } from "../controllers/modules";


const router = Router({mergeParams: true});

router.route('/')
.get(getAllModules)

router.route('/')
.post(addModule);

router.route('/:module_id')
.get(getModule)
.patch(updateModule)
.delete(deleteModule);

router.route('/:module_id/resources')
.post(addResource);

router.route('/:module_id/resources/:resource_id')
.patch( updateResource)
.delete(deleteResource);

router.route('/:module_id/tests')
.post(addTest);

router.route('/:module_id/tests/:test_id')
.get(getTest)
.patch(updateTest)
.delete(deleteTest);


export default router;