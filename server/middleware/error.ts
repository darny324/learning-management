import { ErrorRequestHandler, NextFunction, Request, Response } from "express";

const errorMiddleware = (err:ErrorRequestHandler, req:Request, res:Response, next:NextFunction) => {
    if ( err instanceof Error ){
        console.log(err.message + " => ", err);
        res.status(500).json({
            status: false, 
            message: err.message, 
            status_code: 500
        });
    } else {
        console.log("Internal server error", err);
        res.status(500).json({
            status: false, 
            message: "Internal server error", 
            status_code: 500
        });
    }
}

export default errorMiddleware;