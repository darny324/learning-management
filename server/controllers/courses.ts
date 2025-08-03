import { Request, Response } from "express";
import { NormalResponse } from "./response_type";
import CustomError from "../error/custom_error";
import pool from "../db/pool";

type Course = {
    course_id: string, 
    category: string, 
    title: string, 
    description: string, 
    price: number, 
    discount: number, 
    teacher_id: string, 
    level: string, 
    duration: number, 
    language: string, 
    thumbnail_url: string, 
    modules?: [] | null, 
    teacher_name?: string | null, 
    teacher_profile_image: string | null, 
    created_at: string, 
    updated_at: string, 
};

type RequestCourse = {
    category: 'technology' | 'science' | 'langauage' | undefined, 
    title: string | undefined, 
    description: string | undefined, 
    price: number | undefined, 
    discount: number | undefined, 
    teacher_id: string | undefined, 
    level: string | undefined, 
    duration: number | undefined, 
    language: string | undefined, 
    thumbnail_url: string | undefined, 
}

type CourseResponse = NormalResponse & { course?: Course | undefined | {} };
type CourseResponseArr = NormalResponse & { courses?: Course[]};


const getAllCourses = async (
    req:Request<
    any, any, any, 
    {
        title: string | undefined, 
        category: 'technology' | 'language' | 'science' | undefined, 
        level: 'beginner' | 'intermediate' | 'advanced' | undefined, 
        price: string | undefined, 
        price_op: '>' | '<' | '>=' | '<=' | '=' | undefined,
        language: string | undefined,
        discount: string | undefined, 
        discount_op: '>' | '<' | '>=' | '<=' | '=' | undefined,  
        sort: string | undefined, 
        page: number | undefined, 
        limit: number | undefined, 
        fields: string | undefined, 
        user_id: string | undefined, 
    }
    >, 
    res:Response<CourseResponseArr>
):Promise<void> => {
    const {
        title, 
        category, 
        level, 
        price, 
        price_op, 
        language, 
        discount, 
        discount_op, 
        sort,
        page, 
        limit, 
        fields,
        user_id
    } = req.query;
    const searchFields:string[] = [];
    if ( title ){
        searchFields.push(`LOWER(title) LIKE '%${title.toLowerCase()}%'`);
    }
    if ( category ){
        searchFields.push(`category = '${category}'`);
    }
    if ( level ){
        searchFields.push(`level = '${level}'`);
    }
    if ( price ){
        const op = price_op || '=';
        searchFields.push(`price ${op} ${price}`);
    }
    if ( discount ){
        const op = discount_op || '=';
        searchFields.push(`discount ${op} ${discount}`);
    }
    if ( language ){
        searchFields.push(`language = '${language}'`);
    }
    if ( user_id ){
        searchFields.push(`user_id = '${user_id}'`);
    }

    
    const searchClause:string = searchFields.length ? "WHERE " + searchFields.join(' AND ') : '';
    const sortClause:string = `ORDER BY ${sort || 'c.created_at'}`;
    const field_str:string = fields || 'c.*';
    const page_num = page || 1;
    const limit_num = limit || 10;
    const offset = (page_num - 1) * limit_num;
    try {
        const result = await pool.query<Course>(`
            SELECT 
                ${field_str},
                u.first_name || ' ' || u.last_name AS teacher_name, 
                u.profile_image AS teacher_profile_image 
            FROM 
                courses c 
                INNER JOIN users u ON c.teacher_id = u.user_id
            ${searchClause} 
            ${sortClause}
            LIMIT $1 OFFSET $2;
        `, [limit_num, offset]);
        const courses = result.rows;
        res.status(200).json({
            status: true, 
            message: 'success', 
            courses: courses, 
        });
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Fetching courses';
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

const addCourse = async (
    req:Request<any, any, RequestCourse>, 
    res:Response<CourseResponse>
):Promise<void> => {
    const {
        category, 
        title, 
        description, 
        price, 
        discount, 
        teacher_id, 
        level, 
        duration, 
        language, 
        thumbnail_url, 
    } = req.body as RequestCourse;

    const values:(string | number)[] = [];
    const fields:string[] = [];
    if ( category ) {
        fields.push('category');
        values.push(category);
    }
    if ( title ){
        fields.push('title');
        values.push(title);
    }
    if ( description ){
        fields.push('description');
        values.push(description);
    }
    if ( price ){
        fields.push('price');
        values.push(price);
    }
    if ( discount ){
        fields.push('discount');
        values.push(discount);
    }
    if ( level ){
        fields.push('level');
        values.push(level);
    }
    if ( duration ){
        fields.push('duration');
        values.push(duration);
    }
    if ( language ){
        fields.push('language');
        values.push(language);
    }
    if ( thumbnail_url ){
        fields.push('thumbnail_url');
        values.push(thumbnail_url);
    }
    if ( teacher_id ){
        fields.push('teacher_id');
        values.push(teacher_id);
    }
    const fieldClause:string = fields.join(',');
    const valueClause:string = Array.from({
        length: fields.length, 
    }, (_, i) => {
        return `$${i+1}`
    }).join(',');

    try {
        if ( 
            !category || 
            !title || 
            !price || 
            !teacher_id 
        ) {
            throw new CustomError("Insufficient course data", 400);
        }

        const result = await pool.query(
            `
            INSERT INTO 
                courses(${fieldClause})
            VALUES (${valueClause}) RETURNING *;
            `, [...values]
        );
        if ( result.rowCount === 0 ){
            throw new CustomError("Unable to create add course", 500);
        }
        const course = result.rows[0];
        res.json({
            status: true, 
            message: "success", 
            course: course,
        });
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Adding a course';
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

const getCourse = async (
    req:Request<{course_id:string}, any, any, {include_modules:boolean | undefined}>,
    res:Response<CourseResponse>
):Promise<void> => {
    const {course_id} = req.params;
    const {include_modules} = req.query;
    
    try {
        const result = await pool.query<Course>(`
            SELECT 
                c.*, 
                CASE WHEN $2::boolean THEN (
                    SELECT json_agg(
                        json_build_object(
                            'module_id', m.module_id, 
                            'module_title', m.module_title, 
                            'order_num', m.order_num
                        )
                    )
                    FROM 
                        modules m 
                    WHERE m.course_id = c.course_id
                ) ELSE NULL END AS modules
            FROM 
                courses c
            WHERE c.course_id = $1
        `, [course_id, include_modules]);
        if ( result.rowCount === 0) {
            throw new CustomError('Error in Fetching a course with id ' + course_id, 500);
        }
        const course = result.rows[0];
        res.status(200).json({
            status: true, 
            message: 'success', 
            course: course, 
        })
    } catch (err) {
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

const updateCourse = async (
    req:Request<{course_id:string}, any, RequestCourse>, 
    res:Response<CourseResponse>
):Promise<void> => {
    const {course_id} = req.params;
    const {
        category, 
        title, 
        description, 
        price, 
        discount,  
        level, 
        duration, 
        language, 
        thumbnail_url, 
    } = req.body as RequestCourse;

    let updateFields:string[] = [];
    if ( category ) {
        updateFields.push(`category = '${category}'`);
    }
    if ( title ){
        updateFields.push(`title = '${title}'`);
    }
    if ( description ){
        updateFields.push(`description = '${description}'`);
    }
    if ( price ){
        updateFields.push(`price = ${price}`);
    }
    if ( discount ){
        updateFields.push(`discount = ${discount}`);
    }
    if ( level ){
        updateFields.push(`level = '${level}'`);
    }
    if ( duration ){
        updateFields.push(`duration = ${duration}`);
    }
    if ( language ){
        updateFields.push(`language = '${language}'`);
    }
    if ( thumbnail_url ){
        updateFields.push(`thumbnail_url = '${thumbnail_url}'`);
    }

    const updateClause:string = updateFields.join(', ');
    if ( updateFields.length === 0 ){
        res.json({
            status: true, 
            message: 'No field is provided', 
        });
        return;
    }
    try {
        const result = await pool.query<Course>(`
           UPDATE courses SET ${updateClause} WHERE $1; 
        `, [course_id]);
        if ( result.rowCount === 0 ){
            throw new Error('Error in updating courses');
        }
        const course = result.rows[0];
        res.status(200).json({
            status: true, 
            message: 'success', 
            course: course, 
        });
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Updating a course';
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

const deleteCourse = async (
    req:Request<{course_id:string}>, 
    res:Response<CourseResponse>
):Promise<void> => {
    const {course_id} = req.params;

    
    try {
        await pool.query(`
           DELETE FROM courses WHERE course_id = $1; 
        `, [course_id]);

        res.status(200).json({
            status: true, 
            message: 'success'
        });
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Deleting a course';
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

export {getAllCourses, addCourse, getCourse, updateCourse, deleteCourse};