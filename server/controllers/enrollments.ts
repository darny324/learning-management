import { Request, Response } from "express";
import { NormalResponse } from "./response_type";
import CustomError from "../error/custom_error";
import pool from "../db/pool";

type Enrollment = {
    course_id: string | undefined, 
    student_id: string | undefined, 
    enrollment_id?: number | undefined, 
    enrollment_date?: string | undefined, 
    last_visited?:string | undefined, 
}

type EnrollmentResponse = NormalResponse & {enrollment?: Enrollment | {} | null, count?: number};

const addEnrollment = async (
    req:Request<any, any, {course_id: string | undefined, user_id: string | undefined}>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, user_id} = req.body;

    try {
        if ( !course_id || !user_id ){
            throw new CustomError('Course ID and User ID are necessary', 400);
        }

        const {rowCount} = await pool.query(`
            INSERT INTO enrollments (course_id, student_id) 
            VALUES ($1, $2) RETURNING *; 
        `, [course_id, user_id]);
        if ( rowCount === 0 ){
            throw new CustomError('Error in adding enrollment', 500);
        }

        res.status(201).json({
            status:true, 
            message: 'success', 
        });
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in Fetching a course';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const getEnrollments = async (
    req:Request<any, any, any, {course_id?:string, user_id?:string, show_count?:boolean}>, 
    res:Response<EnrollmentResponse>
) => {

    const {course_id, user_id, show_count} = req.query;

    const enrollFields: string[] = [];
    if ( course_id ){
        enrollFields.push(`course_id = '${course_id}'`);
    }
    if ( user_id ){
        enrollFields.push(`user_id = '${user_id}'`);
    }
    const enrollClause = enrollFields.length > 0 ? 
    ' WHERE ' +  enrollFields.join(' AND ')
    : '';
    try {
        const {rowCount, rows} = await pool.query<Enrollment>(`
        SELECT 
            e.*, 
            c.title, c.price, c.discount, c.course_id, c.thumbnail_url, 
            u.first_name, u.last_name, u.profile_image, u.user_id
        FROM 
        enrollments e
        INNER JOIN courses c ON e.course_id = c.course_id
        INNER JOIN users u ON e.student_id = u.user_id
        ${enrollClause}; 
        `);
        if ( rowCount === 0 ){
            throw new CustomError('No enrollments found', 500);
        }
        const response: EnrollmentResponse = {
            status: true, 
            message: 'success', 
            enrollment: rows, 
        }
        if ( show_count) response.count = rowCount as number;
        res.status(200).json(response);
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in Fetching a course';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const deleteEnrollments = async (
    req:Request<any, any, {enrollment_ids: number[] | undefined}>, 
    res:Response<NormalResponse>
) => {
    const {enrollment_ids} = req.body;

    try {
        if ( !enrollment_ids ){
            throw new CustomError('Enrollment IDs are necessary', 400);
        }

        await pool.query(`
        DELETE FROM enrollments WHERE enrollment_id = ANY($1); 
        `, [enrollment_ids]);
        res.status(200).json({
            status: true, 
            message: 'success',
        })
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in Fetching a course';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

export {
    addEnrollment, 
    getEnrollments, 
    deleteEnrollments
}