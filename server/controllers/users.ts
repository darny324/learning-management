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

type MultipleUserResponse = NormalResponse & {users?: User[] | null};
type SingleUserResponse = NormalResponse & {user?: User | null};
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
    fields: string | undefined, 
};


const getAllUsers = async (
    req:Request<any, any, any, QueryType>, 
    res:Response<MultipleUserResponse>
):Promise<void> => {
    const {
        name, 
        sort, 
        page, 
        limit, 
        interests, 
        type_of_user,
        fields, 
    } = req.query as QueryType;

    const page_num = page ? page : 1;
    const limit_num = limit ? limit : 10;
    const offset = (page_num - 1) * limit_num;
    let sortClause = '';
    let searchClause = '';
    const searchFields:string[] = [];
    const columns:string = fields || '*';
    
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
            ${columns}
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

const addUser = async (
    req:Request<any, any, UserRequest>,
    res:Response<SingleUserResponse & {token?:string}>
):Promise<void> => {
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
        const token = jwt.sign({user_id:user.user_id, user_name: user.first_name + " " + user.last_name}, process.env.JWT_SECRET as string);
        res.status(200).json({
            message: "Successful", 
            status: true, 
            user: user, 
            token: token, 
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

const signIn = async (
    req:Request<any, any, {email: string, password: string}>, 
    res:Response<SingleUserResponse & {token?:string}>
) => {
    const {email, password} = req.body;

    try {
        const result = await pool.query<User & {password:string}>(`
        SELECT * FROM users WHERE email = $1; 
        `, [email]);
        if ( result.rowCount === 0 ){
            throw new CustomError('Invalid Email', 404);
        }
        const user = result.rows[0];
        const check = await bcrypt.compare(password, user.password);
        if ( !check ){
            throw new CustomError('Invalid Password', 400);
        }

        const token = jwt.sign({user_id:user.user_id, email: user.email}, process.env.JWT_SECRET as string);
        res.status(200).json({
            status: true, 
            message: 'success', 
            user: user, 
            token: token, 
        });
    } catch (err){
        if ( err instanceof Error ){
            console.log("Error in Signing in => " + err.message + " => ", err);
            const stauts_code = err instanceof CustomError ? err.status_code : 400;
            res.status(stauts_code).json({
                status: false, 
                message: err.message, 
            });
        } else {
            console.log("Error in Signing in" + " => ", err);
            res.status(400).json({
                status: false, 
                message: "Error in Signing in", 
            });   
        } 
    }
}

const getUser = async (
    req:Request<{user_id:string}, any, any, 
    {
        show_courses: string | undefined, 
        show_num_finished_courses: string | undefined, 
        show_num_enrollments: string | undefined, 
        show_num_friends: string | undefined, 
        fields: string | undefined, 
    }
    >, 
    res:Response<SingleUserResponse>
):Promise<void> => {
    const {user_id} = req.params;
    const {
        show_courses, 
        show_num_finished_courses, 
        show_num_enrollments, 
        show_num_friends, 
        fields, 
    } = req.query;
    const selectFields:string[] = [];
    const joinFields:string[] = [];
    const starterField:string = fields || `
    u.user_id, 
    u.type_of_user, 
    u.first_name, 
    u.last_name, 
    u.email, 
    u.phone_num, 
    u.address, 
    u.profile_image, 
    u.bios, 
    u.interests, 
    u.created_at, 
    u.updated_at
    `;
    if ( show_courses == 'true'){
        selectFields.push(`
        ${show_num_enrollments === 'true' ? 'COUNT(e.enrollment_id) AS num_enrollments, ' : ''}
        COALESCE(json_agg(
            jsonb_build_object(
                'course_id', c.course_id, 
                'title', c.title, 
                'category', c.category, 
                'level', c.level, 
                'thumbnail_url', c.thumbnail_url
            )
        ), '[]'::json) AS courses
        `);
        joinFields.push(`
        LEFT JOIN enrollments e ON e.student_id = u.user_id    
        LEFT JOIN courses c ON c.course_id = e.course_id
        `);
    }
    if ( show_num_finished_courses){
        selectFields.push(`
        COUNT(fc.course_id) AS num_finished_courses
        `);
        joinFields.push(`
        LEFT JOIN finished_courses fc ON fc.user_id = u.user_id    
        `);
    }
    if ( show_num_friends ){
        selectFields.push(`
        COUNT(f.course_id) AS num_friends
        `);
        joinFields.push(`
        LEFT JOIN friendships f ON u.user_id IN (f.user_id1, f.user_id2)    
        `);
    }
    const selectClause:string = selectFields.length > 0 ? starterField + ', ' +  selectFields.join(', ') : starterField;
    const joinClause:string = joinFields.join(' ');
    try {
        if ( !user_id )
            throw new CustomError('Invalid Student Id', 400);

        const result = await pool.query<User>(`
        SELECT 
        ${selectClause}
        FROM users u
        ${joinClause}
        WHERE u.user_id = $1 GROUP BY u.user_id;
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


export {addUser, getAllUsers, getUser, signIn};