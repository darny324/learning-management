import passport from "passport";
import googleStrategy from "./google";

passport.use('google', googleStrategy);

export default passport;