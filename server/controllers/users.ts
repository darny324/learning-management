import { Request, Response } from "express";
import pool from "../db/pool";
import { NormalResponse } from "./response_type";
import CustomError from "../error/custom_error";
import { PoolClient } from "pg";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'

type User = {
    user_id: string, 
    first_name: string,
    last_name: string, 
    type_of_user: 'student' | 'teacher', 
    profile_image: string, 
    age: number, 
    gender: 'male' | 'female', 
    email: string, 
    phone_num: string, 
    bios: string, 
    interests: string, 
    address: {x:number, y:number}, // latitude is x and longitude is y
    created_at: string, 
    updated_at: string,
}

type MultipleUserResponse = NormalResponse & {users?: User[] | null};
type SingleUserResponse = NormalResponse & {user?: User | {} | null};
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
};

type QueryType = {
    name: string | undefined, 
    sort: string | undefined, 
    page: number | undefined, 
    limit: number | undefined, 
    interests: string | undefined, 
    type_of_user: 'teacher' | 'student' | undefined, 
};


const getAllUsers = async (
    req:Request<any, any, any, QueryType>, 
    res:Response<any>
):Promise<void> => {
    const {
        name, 
        sort, 
        page, 
        limit, 
        interests, 
        type_of_user, 
    } = req.query as QueryType;

    const page_num = page ? page : 1;
    const limit_num = limit ? limit : 10;
    const offset = (page_num - 1) * limit_num;
    let sortClause = '';
    let searchClause = '';
    const searchFields:string[] = [];
    
    if ( sort ){
        sortClause = `ORDER BY ${sort}`;
    }
    if ( name ) {
        searchFields.push(`LOWER(first_name || ' ' || last_name) LIKE '%${name.toLocaleLowerCase()}%'`);
    }
    if ( interests ){
        searchFields.push(`interests = '${interests}'`);
    }
    if ( type_of_user ){
        searchFields.push(`type_of_user = '${type_of_user}'`)
    }
    if ( searchFields.length > 0 ){
        searchClause = 'WHERE ' + searchFields.join(' AND ');
    }
    
    try {
        const result = await pool.query(`
        SELECT 
            user_id, 
            first_name || ' ' || last_name AS full_name,
            email, 
            interests, 
            type_of_user, 
            profile_image
        FROM users ${searchClause} ${sortClause} LIMIT $1 OFFSET $2;
        `, [limit_num, offset]);

        
        const users = result.rows;
        res.status(200).json({
            status:true, 
            message: "Success", 
            users
        });
        
    } catch (err) {
        let status_code:number = 400;
        let message:string = "Error in fetching users";
        if ( err instanceof Error ){
            console.log(err.message + " => ", err);
            message = err.message;
        } else {
            console.log("Error in fetching users => ", err);
        }

        res.status(status_code).json({
            status: false, 
            message: message, 
        });
    }
}

const addUser = async (req:Request<any, any, UserRequest>, res:Response<SingleUserResponse>):Promise<void> => {
    const {
        first_name, 
        last_name, 
        email, 
        password, 
        profile_image, 
        type_of_user, 
        phone_num, 
        bios, 
        interests, 
        address, 
        age, 
        gender,
    } = req.body as UserRequest;

    console.log(phone_num);
    const client:PoolClient = await pool.connect();
    
    try { 
        if ( 
            !first_name || 
            !last_name ||
            !email ||
            !type_of_user || 
            !phone_num ||
            !bios ||
            !interests ||
            !address || 
            !age || 
            !gender ||
            !password
        ) {
            throw new CustomError('All data must be provided', 400);
        }
        const salt:string = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        
        await client.query('BEGIN;');
        const result = await client.query(`
        INSERT INTO 
        users(first_name, last_name, email, phone_num, type_of_user, bios, interests, address, profile_image, age, gender, password)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *; 
        `, [first_name, last_name, email, phone_num, type_of_user, bios, 
            interests, `(${address.x}, ${address.y})`, profile_image, age, gender, hashPassword]);
            
        await client.query('COMMIT;');
        client.release();
        if ( result.rowCount === 0 )
            throw new CustomError("Inserting new user unsuccessful", 500);
        
        const user = result.rows[0];
        jwt.sign({user_id:user.user_id, user_name: user.first_name + " " + user.last_name}, process.env.JWT_SECRET as string);
        res.status(200).json({
            message: "Successful", 
            status: true, 
        })
    } catch (err){
        if ( err instanceof Error ){
            console.log("Error in Adding stduent" + err.message + " => ", err);
            await client.query('ROLLBACK;');
            client.release();
            const stauts_code = err instanceof CustomError ? err.status_code : 400;
            res.status(stauts_code).json({
                status: false, 
                message: err.message, 
            });
        } else {
            console.log("Error in Adding stduent" + " => ", err);
            await client.query('ROLLBACK;');
            client.release();
            res.status(400).json({
                status: false, 
                message: "Error in Adding Student", 
            });   
        } 
    }
}

const getUser = async (req:Request<{user_id:string}>, res:Response<SingleUserResponse>):Promise<void> => {
    const {user_id} = req.params;

    try {
        if ( !user_id )
            throw new CustomError('Invalid Student Id', 400);

        const result = await pool.query<User>(`
        SELECT 
        u.*
        FROM users u
        WHERE u.user_id = $1;
        `, [user_id]);
        if ( result.rowCount === 0){
            throw new CustomError('User Not Found with id: ' + user_id, 400);
        }
        const student = result.rows[0] as User;
        res.status(200).json({
            message: "Success", 
            status: true, 
            user: student, 
        })
    } catch (err){
        if ( err instanceof Error ){
            console.log("Error in Adding stduent" + err.message + " => ", err);
            const stauts_code = err instanceof CustomError ? err.status_code : 400;
            res.status(stauts_code).json({
                status: false, 
                message: err.message, 
            });
        } else {
            console.log("Error in Adding stduent" + " => ", err);
            res.status(400).json({
                status: false, 
                message: "Error in Adding Student", 
            });   
        } 
    }
}

const updateUser = async (
    req:Request<{user_id:string}, any, UserRequest | null | undefined>, 
    res:Response<SingleUserResponse>
):Promise<void> => {
    if ( !req.body ){
        res.status(400).json({
            message: "No field is provided", 
            status: false, 
        })
        return;
    }
    const {user_id} = req.params;
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
        fields.push('first_name');
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
    req:Request<{user_id:string}, any, {old_password: string, new_password:string} | null | undefined>,
    res:Response<SingleUserResponse> 
):Promise<void> => {
    if ( !req.body ){
        throw new CustomError("No New Password is provided", 400);
    }
    const {user_id} = req.params;
    const {old_password, new_password} = req.body;

    try {
        const result = await pool.query<{password:string}>(`
            SELECT password FROM users WHERE user_id = $1
            `, [user_id]);
        if ( result.rowCount === 0){
            throw new CustomError('No User Found or Error in Changing Password', 404);
        }
        const original_password = result.rows[0].password;
        const check = await bcrypt.compare(old_password, original_password);
        if ( check ){
            const result2 = await pool.query<User>(`
            UPDATE users SET password = $1 WHERE user_id = $2 RETURNING *;
            `, [new_password, user_id]);
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

export {addUser, getAllUsers, getUser, updateUser, changePassword, deleteUser};