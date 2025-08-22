import { Request, Response } from "express";
import { NormalResponse } from "./response_type";
import CustomError from "../error/custom_error";
import pool from "../db/pool";
import bcrypt from 'bcrypt';

type User = {
    user_id: string, 
    first_name: string,
    last_name: string, 
    type_of_user: 'student' | 'teacher', 
    profile_image: string, 
    age: number, 
    gender: 'male' | 'female', 
    email: string, 
    courses?: [], 
    num_enrollments?: number, 
    num_friends?: number, 
    num_finished_courses?: number,
    phone_num: string, 
    bios: string, 
    interests: string, 
    address: {x:number, y:number}, // latitude is x and longitude is y
    created_at: string, 
    updated_at: string,
}

type SingleUserResponse = NormalResponse & { user?: User | null | {}};
type UserRequest = {
    first_name: string | null | undefined,
    last_name: string | null | undefined, 
    type_of_user: 'student' | 'teacher' | null | undefined,
    gender: 'male' | 'female' | null | undefined, 
    age: number | null | undefined,  
    profile_image: string | null | undefined, 
    email: string | null | undefined, 
    password: string | null | undefined, 
    phone_num: string | null | undefined, 
    bios: string | null | undefined, 
    interests: string | null | undefined, 
    address: {x:number, y:number} | null | undefined, 
    decoded_user?: {user_id: string | null, user_name: string | null}, 
};

const updateUser = async (
    req:Request<any, any, UserRequest | null | undefined>, 
    res:Response<SingleUserResponse>
):Promise<void> => {
    if ( !req.body ){
        res.status(400).json({
            message: "No field is provided", 
            status: false, 
        })
        return;
    }
    const decoded_user = req.body.decoded_user;
    if ( !decoded_user ){
        throw new CustomError("Your are not authorized to update the user", 401);
    }
    const user_id = decoded_user.user_id;
    if ( !user_id ){
        throw new CustomError("invalid user_id", 400);
    }

    const {
        first_name, 
        last_name, 
        email, 
        address, 
        bios, 
        interests, 
        phone_num, 
        profile_image, 
        gender, 
        age, 
        type_of_user, 
    } = req.body;
    const fields:string[] = [];
    const values:(string|number)[] = [];
    if (first_name){
        fields.push('first_name = ');
        values.push(first_name);
    }
    if ( last_name ){
        fields.push('last_name');
        values.push(last_name);
    }
    if ( email ){
        fields.push('email');
        values.push(email);
    }
    if ( bios ){
        fields.push('bios');
        values.push(bios);
    }
    if ( address ){
        fields.push('address');
        values.push(`(${address.x}, ${address.y})`);
    }
    if ( phone_num ){
        fields.push('phone_num');
        values.push(phone_num);
    }
    if ( age ){
        fields.push('age');
        values.push(age);
    }
    if ( gender ){
        fields.push('gender');
        values.push(gender);
    }
    if ( interests ){
        fields.push('interests');
        values.push(interests);
    }
    if ( profile_image ){
        fields.push('profile_image');
        values.push(profile_image);
    }
    if ( type_of_user ){
        fields.push('type_of_user');
        values.push(type_of_user);
    }
    
    const fieldQuery = fields.map((field, index) => {
        if ( index === fields.length - 1){
            return `${field} = $${index + 1} `;
        }
        return `${field} = $${index + 1}, `;
    }).join('');

    
    try {
        const result = await pool.query<User>(`
        UPDATE users SET ${fieldQuery}, updated_at = NOW() WHERE user_id = '${user_id}' RETURNING *;
        `, values);
        if ( result.rowCount === 0){
            throw new CustomError("Updating User Failed or Invalid user_id", 500);
        }
        
        const user = result.rows[0];
        res.status(200).json({
            message: "Success", 
            status: true, 
            user: user,
        });
    } catch (err){
        if ( err instanceof Error ){
            console.log("Error in Updating stduent => " + err.message + " => ", err);
            const stauts_code = err instanceof CustomError ? err.status_code : 400;
            res.status(stauts_code).json({
                status: false, 
                message: err.message, 
            });
        } else {
            console.log("Error in Updatig stduent" + " => ", err);
            res.status(400).json({
                status: false, 
                message: "Error in Updating Student", 
            });   
        } 
    }

}

const changePassword = async (
    req:Request<any, any, {old_password: string, new_password:string, decoded_user: null | {user_id:string, email:string}} | null | undefined>,
    res:Response<SingleUserResponse> 
):Promise<void> => {
    if ( !req.body ){
        throw new CustomError("No New Password is provided", 400);
    }
    const {decoded_user} = req.body;
    const {old_password, new_password} = req.body;

    

    try {
        if ( !old_password || !new_password ) {
            throw new CustomError("Old Password and New Password are required", 400);  
        }
        if (!decoded_user || !decoded_user.user_id){
            throw new CustomError("You are not authorized to change the password", 401);
        }
        const {user_id} = decoded_user;
        const result = await pool.query<{password:string}>(`
            SELECT password FROM users WHERE user_id = $1;
            `, [user_id]);
        if ( result.rowCount === 0){
            throw new CustomError('No User Found or Error in Changing Password', 404);
        }
        const original_password = result.rows[0].password;
        const check = await bcrypt.compare(old_password, original_password);
        if ( check ){
            const salt = await bcrypt.genSalt(10);
            const hashed_password = await bcrypt.hash(new_password, salt);
            const result2 = await pool.query<User>(`
            UPDATE users SET password = $1 WHERE user_id = $2 RETURNING *;
            `, [hashed_password, user_id]);
            if ( result2.rowCount === 0){
                throw new CustomError("Error in Changing Password", 500);
            }
            res.status(200).json({
                message: "success",
                status: true, 
                user: result2.rows[0],
            })
        } else {
            throw new CustomError("Password Incorrect", 400);
        }
    } catch (err){
        if ( err instanceof Error ){
            console.log("Error in Changing stduent => " + err.message + " => ", err);
            const stauts_code = err instanceof CustomError ? err.status_code : 400;
            res.status(stauts_code).json({
                status: false, 
                message: err.message, 
            });
        } else {
            console.log("Error in Changing stduent" + " => ", err);
            res.status(400).json({
                status: false, 
                message: "Error in Changing Student", 
            });   
        } 
    }
}

const deleteUser = async (
    req:Request<{user_id:string}>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {user_id} = req.params;

    try {
        await pool.query(`
        DELETE FROM users WHERE user_id = $1;
        `, [user_id]); 

        res.status(200).json({
            status: true, 
            message: "User deletion successful",
        });
    } catch (err) {
        if ( err instanceof Error ){
            console.log("Error in deleting user", err.message, err);
            res.status(500).json({
                status: false, 
                message: err.message, 
            })
        } else {
            console.log("Error in Deleting user", err);
            res.status(500).json({
                status: false, 
                message: "Error in deleting user", 
            })
        }
    }
} 


const getAuthorizedUser = async (
    req:Request, 
    res:Response<SingleUserResponse>
) => {
    const {decoded_user} = req.body;
    try {
        if ( !decoded_user || !decoded_user.user_id) {
            throw new CustomError("You are not authorized to get the user", 401);
        }

        const {user_id} = decoded_user;
        const result = await pool.query<User>(`
        SELECT * FROM users WHERE user_id = $1; 
        `, [user_id]);
        if ( result.rowCount === 0 ){
            throw new CustomError("No User Found", 404);
        }
        const user = result.rows[0];
        res.status(200).json({
            status: true, 
            message: 'success', 
            user: user, 
        })
    } catch (err){
        let status_code = 500;
        let message = "Error in getting authorized user";
        if ( err instanceof Error )
            message = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        console.log("Error in getting authorized user => ",message,  err);
        res.status(status_code).json({
            status:false, 
            message: message, 
        });
    }
}

export {
    updateUser, 
    changePassword,
    deleteUser, 
    getAuthorizedUser
}