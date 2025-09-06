import { Request, Router } from "express";
import { addUser, getAllUsers, GetSmartCode, getUser, loginGoogle, signIn, VerifyCode } from "../controllers/users";
import passport from '../middleware/passport'
import CustomError from "../error/custom_error";
import { Profile } from "passport";

const router = Router();

router.route('/')
.post(addUser)
.get(getAllUsers);

router.route('/get-code')
.patch(GetSmartCode);

router.route('/verify-code')
.patch(VerifyCode);

router.route('/sign-in')
.patch(signIn);

router.route('/google/login')
.get(passport.authenticate('google', {scope: ['profile', 'email']}));

router.route('/google/login/callback')
.get(passport.authenticate('google', {session: false, failureRedirect: '/login'}), loginGoogle);

router.route('/:user_id')
.get(getUser);

export default router;