import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express';

const authorizationMiddleware = async (req:Request, res:Response, next:NextFunction):Promise<void> => {
    const authorization = req.headers.authorization;
    
    try {
        if ( !authorization?.startsWith('Bearer '))
            throw new Error("Invalid token form => Must start with 'Bearer '");

        const token = authorization.split(' ')[1];
        const decoded:{email:string | null, user_id:string | null} = jwt.verify(token, process.env.JWT_SECRET as string) as {user_id: string | null, email: string | null};
        if ( decoded.user_id === null || decoded.email === null){
            throw new Error('Invalid token');
        }
        req.body = {...req.body, decoded_user: decoded};
        next();
    } catch (err) {
        if ( err instanceof Error ){
            console.log(err.message + " => ", err);
            res.status(401).json({
                message: err.message, 
                status: false, 
                status_code: 401, 
            });
        } 
        else {
            console.log("Error in Authorization Middleware", err);
            res.status(401).json({
                message: "Error in Authorization Middleware", 
                status: false, 
                status_code: 401, 
            })
        }
    }
}

export default authorizationMiddleware;