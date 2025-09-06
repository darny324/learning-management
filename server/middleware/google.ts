import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { Profile } from "passport";
import { VerifyCallback } from "jsonwebtoken";
import pool from "../db/pool";


const googleStrategy = new GoogleStrategy({
    clientID: process.env.CLIENT_ID as string, 
    clientSecret: process.env.CLIENT_SECRET as string,
    callbackURL: process.env.REDIRECT_CALLBACK as string, 

}, async (accessToken:string, refreshToken:string, profile:Profile, done:VerifyCallback) => {
    try {
        const emails = profile.emails;
        if ( !emails ){
            throw new Error("Error in Logging in");
        }
        const e = emails[0].value;
        
        const {rows, rowCount} = await pool.query(`
        SELECT user_id, email, first_name, last_name FROM users WHERE email = $1; 
        `,[e]);
        let isSignIn:boolean = true;
        if ( rowCount === 0 )
            isSignIn = false;

        done(null, {
            profile: profile, 
            IsSignIn: isSignIn, 
            user: rowCount !== 0 ? rows[0] : null, 
        })
    } catch (err){
        done(null, undefined);
    }
})

export default googleStrategy;