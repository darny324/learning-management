import { Request, Response } from "express"
import CustomError from "../error/custom_error";
import { NormalResponse } from "./response_type";
import pool from "../db/pool";

type Resource = {
    resource_id: number | undefined, 
    title: string | undefined | null,
    video_url: string | null | undefined, 
    text_url: string | null | undefined, 
}

type Question = {
    question: string | undefined | null, 
    correct_answer: number | undefined | null, 
    answers: string[] | undefined | null, 
    question_id?: number | null | undefined, 
    explanation: string | null | undefined
}

type Test = {
    test_id: number | undefined, 
    order_num: number | undefined, 
    questions?: Question[] | null | undefined, 
}

type Module = {
    module_id: number | undefined, 
    course_id: string | undefined, 
    module_title: string | undefined, 
    description: string | undefined, 
    next_module_id: number | null | undefined, 
    prev_module_id: number | null | undefined, 
    duration: number | undefined, 
    created_at: string | undefined, 
    updated_at: string | undefined, 
    resources?: [] | Resource[] |  null, 
    tests?: [] | Test[] |null, 
}



type ResponseModule = NormalResponse & {module?:Module | null};
type ResponseModuleArr = NormalResponse & {modules?:Module[] | null};


const getOrderNum = async (after_order_num:number | null | undefined, course_id:string, module_id:string, type:'resources' | 'tests' = 'resources'):Promise<{order_num:number, reorder:boolean}> => {

    let num:number = 10;
    const from_tabe = type === 'resources' ? 'resources' : 'tests';
    const order_res = await pool.query<{order_num:number}>(`
    SELECT order_num
    FROM ${from_tabe} 
    WHERE course_id = $1 AND module_id = $2
    ORDER BY order_num;
    `, [course_id, module_id]);
    const {rows:resources, rowCount:resourceCount} = order_res;
    let reorder:boolean = false;

    if ( resourceCount === 0 ){
        num = 10;
    }
    else if ( after_order_num === null || after_order_num === undefined ){
        num = resources[resources.length - 1].order_num + 10;
    }
    else if ( after_order_num === 0){
        num = Math.ceil((after_order_num + resources[0].order_num)/2);
        if ( num === resources[0].order_num )reorder = true;
    }
    else if ( resourceCount === 1){
        num = 20;
    }
    else if ( (resourceCount as number) >= 2){
        let temp_order:number = -1;
        for (let i = 0; i < resources.length; i++ ){
            if ( resources[i].order_num > after_order_num){
                temp_order = resources[i].order_num;
                break;
            }
        }
        if ( temp_order === -1)
            num = resources[resources.length - 1].order_num + 10;
        else {
            num = Math.ceil((after_order_num + temp_order)/2);
            if ( num === temp_order )reorder = true;
        }
    }
   
    return {
        order_num: num, 
        reorder: reorder
    };
}

const getAllModules = async (
    req:Request<{course_id:string|null}>, 
    res:Response<ResponseModuleArr>
):Promise<void> => {
    const {course_id} = req.params;

    try {
        const result = await pool.query<Module>(`
        WITH RECURSIVE ordered_modules AS (
            SELECT * FROM modules 
            WHERE course_id = $1 AND prev_module_id IS NULL
            UNION ALL 
            SELECT m.* FROM modules m 
            INNER JOIN ordered_modules om ON om.next_module_id = m.module_id
            WHERE m.course_id = $1
        )
        SELECT * FROM ordered_modules; 
        `, [course_id]);

        res.status(200).json({
            status: true, 
            message: 'success', 
            modules: result.rows, 
        });
        
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Getting modules';
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

const addModule = async (
    req:Request<any, any, 
    {
        title: string | undefined, 
        description: string | undefined, 
        duration: number | undefined, 
        next_module_id: number | undefined | null, 
        prev_module_id: number | undefined | null, 
    }
    >, 
    res:Response<ResponseModule>
):Promise<void> => {
    let {
        title, 
        description, 
        duration, 
        next_module_id, 
        prev_module_id
    } = req.body;
    const {course_id} = req.params;

    try {
        if ( !title ){
            throw new CustomError('Title must be provided', 400);
        }

        const result = await pool.query<Module>(`
        INSERT INTO modules(module_title, description, duration, course_id)
        VALUES ($1, $2, $3, $); 
        `, [title, description, duration, course_id]);
        if ( result.rowCount === 0 )
            throw new CustomError('Error in adding module', 500);

        const {module_id} = result.rows[0];
        if ( prev_module_id ){
            await pool.query(`
            UPDATE modules SET next_module_id = $1 WHERE module_id = $2; 
            UPDATE modules SET prev_module_id = $2 WHERE module_id = $1;
            `, [module_id, prev_module_id]);
        }
        if ( next_module_id ){
            await pool.query(`
            UPDATE modules SET prev_module_id = $1 WHERE module_id = $2;
            UPDATE modules SET next_module_id = $2 WHERE module_id = $1;
            `, [module_id, next_module_id]);
        }

        res.status(200).json({
            status: true, 
            message: 'success', 
            module: result.rows[0],
        });

    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Adding a module';
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

const getModule = async (
    req:Request<{course_id: string | undefined, module_id: string | undefined}>, 
    res:Response<ResponseModule>
):Promise<void> => {
    const {course_id, module_id} = req.params;
    try {
        const result = await pool.query<Module>(`
            SELECT 
                m.*
            FROM modules m 
            WHERE m.module_id = $1 AND m.course_id = $2;
        `, [module_id, course_id]);
        const resourceRes = await pool.query<Resource>(`
        SELECT 
            title, video_url, text_url, resource_id, order_num 
        FROM resources WHERE module_id = $1 ORDER BY order_num; 
        `, [module_id]);

        const testRes = await pool.query<Test>(`
        SELECT 
            t.test_id AS test_id, 
            t.order_num AS order_num, 
            COALESCE(json_agg(
                json_build_object(
                    'question', q.question, 
                    'answers', q.answers, 
                    'question_id', q.question_id, 
                    'correct_answer', q.correct_answer, 
                    'explanation', q.explanation
                )
            ), '[]'::json) AS questions
        FROM tests t
        INNER JOIN questions q ON t.test_id = q.test_id 
        WHERE course_id = $1 AND module_id = $2
        GROUP BY t.test_id;
        `, [course_id, module_id]);

        const {rows:tests, rowCount:testCount} = testRes;
        const {rows:resources, rowCount:resourceCount} = resourceRes;

        if ( result.rowCount === 0 ){
            throw new CustomError('Error in Getting a module', 500);
        }
        res.status(200).json({
            status: true, 
            message: 'success', 
            module: {
                ...result.rows[0], 
                resources: resources, 
                tests: tests, 
            }
        })
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in Adding a module';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}


const updateModule = async (
    req:Request<{course_id: string | undefined, module_id:string | undefined}, any,
    {
        title: string | undefined, 
        description: string | undefined, 
        duration: string | undefined, 
        after: number | undefined | null,
    }
    >, 
    res:Response<ResponseModule>
):Promise<void> => {
    const {
        course_id, module_id
    } = req.params;

    const {
        title, 
        description, 
        duration, 
        after
    } = req.body;

    const updateFields:string[] = [];

    if ( title ){
        updateFields.push(
            `title = '${title}'`
        );
    }
    if ( description ){
        updateFields.push(`description = '${description}'`);
    }
    if ( duration ){
        updateFields.push(`duration = ${duration}`);
    }
    
    const client = await pool.connect();
    let next:number | null;
    let prev:number | null;
    
    try {
        client.query('BEGIN;');

        if ( after !== undefined ){
            const ori_res = await client.query<{
                prev_module_id: number | null, 
                next_module_id: number | null, 
            }>(`
            SELECT prev_module_id, next_module_id FROM modules WHERE module_id = $1 AND course_id = $2; 
            `, [module_id, course_id]);
            if ( ori_res.rowCount === 0)
                throw new Error('Error in updating modules and find modules with id ' + module_id);
            const ori_rows = ori_res.rows[0];
            await client.query(`
            UPDATE modules SET prev_module_id = null, next_module_id = null WHERE module_id = $1 AND course_id = $2; 
            `, [module_id, course_id]);
            await client.query(`
            UPDATE modules SET next_module_id = $1 WHERE module_id = $2 AND course_id = $3;
            `, [ori_rows.next_module_id, ori_rows.prev_module_id, course_id]);
            await client.query(`
            UPDATE modules SET prev_module_id = $2 WHERE module_id = $1 AND course_id = $3;
            `, [ori_rows.next_module_id, ori_rows.prev_module_id, course_id]);
            
            if ( after === null ){
                const res = await client.query<{module_id:number | null}>(`
                SELECT module_id FROM modules WHERE prev_module_id IS NULL AND next_module_id IS NOT NULL AND course_id = $1;  
                `, [course_id]);
                if ( res.rowCount === 0 ){
                    throw new Error('Error in updating ordering modules');
                }
                await client.query(`
                UPDATE modules SET prev_module_id = $1 WHERE module_id = $2 AND course_id = $3; 
                `, [module_id, res.rows[0].module_id, course_id]);
                next = res.rows[0].module_id;
                prev = null;
            } else {
                const {rows, rowCount} = await client.query<{next_module_id:number | null}>(`
                SELECT next_module_id FROM modules WHERE module_id = $1 AND course_id = $2; 
                `, [after, course_id]);
                if ( rowCount === 0)
                    throw new Error('Error in updating ordering in modules');
                const {next_module_id} = rows[0];
                await client.query(`
                UPDATE modules SET next_module_id = $1 WHERE module_id = $2;
                `, [module_id, after]);
                if ( next_module_id ){
                    await client.query(`
                    UPDATE modules SET prev_module_id = $1 WHERE module_id = $2; 
                    `, [module_id, next_module_id]);
                }
                prev = after;
                next = next_module_id;
            }
            updateFields.push(`
                prev_module_id = ${prev}, next_module_id = ${next}
            `);
        }

        const updateClause:string = updateFields.join(', ');
        const result = await client.query<Module>(`
        UPDATE modules SET ${updateClause} WHERE module_id = $1 AND course_id = $2 RETURNING *;
        `, [module_id, course_id]);
        client.query('COMMIT;');

        res.status(200).json({
            status:true, 
            message: 'success', 
            module: result.rows[0],
        });
    } catch (err) {
        client.query('ROLLBACK;');
        client.release();
        let status_code = 404;
        let message:string = 'Error in Adding a module';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const deleteModule = async (
    req:Request<{course_id:string | null, module_id:string | null}>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id} = req.params;
    try {
        await pool.query(`
        DELETE FROM modules WHERE module_id = $1 AND course_id = $2; 
        `, [module_id, course_id]);

        res.status(200).json({
            status: true, 
            message: 'success',
        });
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in Adding a module';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const addResource = async (
    req:Request<{course_id:string | null, module_id:string|null}, any, 
    {
        title: string | null | undefined, 
        video_url: string | null | undefined, 
        text_url: string | null | undefined, 
        after_order_num: number | null, 
    }>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id} = req.params;
    const {
        title, 
        video_url, 
        text_url, 
        after_order_num
    } = req.body;

    const client = await pool.connect();

    try {
        if ( !video_url && !text_url ){
        throw new CustomError('Either a video or text must be provided', 500);
        }

        const fields:string[] = [];
        const values:(string | number)[] = [];
        
        if ( title) {
            fields.push(`title`);
            values.push(`'${title}'`);
        }
        if ( video_url) {
            fields.push(`video_url`);
            values.push(`'${video_url}'`)
        }
        if ( text_url) {
            fields.push(`text_url`);
            values.push(`'${text_url}'`);
        }

        const {order_num, reorder} = await getOrderNum(after_order_num, course_id as string, module_id as string);
        
        fields.push(`order_num`);
        values.push(order_num);

        fields.push('course_id');
        values.push(`'${course_id as string}'`);
        fields.push('module_id');
        values.push(module_id as string);
        const fieldClause = fields.join(', ');
        const valueClause = values.join(', ');

        client.query('BEGIN;');
        const result = await client.query(`
        INSERT INTO resources(${fieldClause})
        VALUES (${valueClause}) RETURNING *;
        `);

        if ( result.rowCount === 0){
            throw new Error('Error Adding Resource');
        }

        if ( reorder ){
            const reorder_res = await client.query<{
                resource_id: number
            }>(`
            SELECT resource_id FROM resources WHERE course_id = $1 AND module_id = $2
            ORDER BY order_num ASC; 
            `, [course_id, module_id]);

            const {rows:resources} = reorder_res;
            for ( let i = 0; i < resources.length; i++ ){
                await client.query(`
                UPDATE resources SET order_num = $1 
                WHERE course_id = $2 AND module_id = $3 AND resource_id = $4; 
                `, [(i + 1) * 10, course_id, module_id, resources[i].resource_id]);
            }
        }
        
        client.query('COMMIT;');
        res.status(200).json({
            status: true, 
            message: 'success'
        });

    } catch (err){
        client.query('ROLLBACK;');
        client.release();
        let status_code = 404;
        let message:string = 'Error in Adding a resource';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const updateResource = async (
    req:Request<
    {
        course_id: string | undefined, 
        module_id: string | undefined, 
        resource_id: string | undefined, 
    }, any, Resource>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id, resource_id} = req.params;
    const {title, video_url, text_url} = req.body;
    
    const updateFields:string[] = [];
    if ( title ){
        updateFields.push(`title = '${title}'`);
    }
    if ( video_url ){
        updateFields.push(`video_url = '${video_url}'`);
    }
    if ( text_url ){
        updateFields.push(`text_url = '${text_url}'`);
    }

    const updatedClause:string = updateFields.join(', ');
    try {
        await pool.query(`
        UPDATE resources SET ${updatedClause} 
        WHERE course_id = $1 AND module_id = $2 AND resource_id = $3; 
        `, [course_id, module_id, resource_id]);

        res.status(200).json({
            status: true, 
            message: 'success', 
        })
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in Adding a resource';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const deleteResource = async (
    req:Request<{
        course_id: string | undefined, 
        module_id: string | undefined, 
        resource_id: string | undefined, 
    }>,
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id, resource_id} = req.params;
    try {
        await pool.query(`
        DELETE FROM resources WHERE course_id = $1 AND module_id = $2 AND resource_id = $3; 
        `, [course_id, module_id, resource_id]);

        res.status(200).json({
            status: true, 
            message: 'success',
        });
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in deleting a resource';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}


const addTest = async (
    req:Request<{
        course_id: string | undefined, 
        module_id: string | undefined, 
    }, any, {
        after_order_num: number | null | undefined, 
        questions: Question[] | null | undefined 
    }>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id} = req.params;
    const {after_order_num, questions} = req.body;
    

    const client = await pool.connect();

    try {
        if ( questions === null || questions === undefined || questions.length === 0){
            throw new CustomError('At least one question must be provided', 400);
        }
        
        const questionValues:string[] = [];
        

        const {order_num, reorder} = await getOrderNum(after_order_num, course_id as string, module_id as string, 'tests');
        client.query('BEGIN;');
        const result = await client.query<{test_id:number}>(`
            INSERT INTO tests(course_id, module_id, order_num)
            VALUES($1, $2, $3) RETURNING test_id;
        `, [course_id, module_id, order_num]);
        const {rows:returnedRows, rowCount} = result;
        console.log(returnedRows);

        if ( reorder ){
            const reorder_res = await client.query<{
                test_id: number
            }>(`
            SELECT test_id FROM tests WHERE course_id = $1 AND module_id = $2
            ORDER BY order_num ASC; 
            `, [course_id, module_id]);

            const {rows:tests} = reorder_res;
            for ( let i = 0; i < tests.length; i++ ){
                await client.query(`
                UPDATE tests SET order_num = $1 
                WHERE course_id = $2 AND module_id = $3 AND test_id = $4; 
                `, [(i + 1) * 10, course_id, module_id, tests[i].test_id]);
            }
        }

        for ( let i = 0; i < questions.length; i++){
            if ( !questions[i]){
                throw new CustomError('Question cannot be empty', 400);
            }

            const {
                question, correct_answer, answers, explanation
            } = questions[i];
            if ( !question || !correct_answer || !answers){
                throw new CustomError('Question, correct answer and answers must be provided', 400);
            }
            if (  answers.length < 2){
                throw new CustomError('At least two answers must be provided', 400);
            }
            if ( correct_answer < 0 || correct_answer > answers.length - 1){
                throw new CustomError('Correct answer must be a valid index of answers', 400);
            }
            const newAns = answers.map(ans => {
                return `'${ans}'`;
            })
            questionValues.push(`
                ('${question}', ${correct_answer}, ARRAY[${newAns.join(',')}], ${explanation ? `'${explanation}'` : 'null'}, ${returnedRows[0].test_id}) 
            `);
        }
        const questionClause = questionValues.join(', ');
        console.log(questionClause);
        await client.query(`
        INSERT INTO questions(question, correct_answer, answers, explanation, test_id)
        VALUES ${questionClause};
        `);
        

        client.query('COMMIT;'); 

        res.status(200).json({
            status:true, 
            message: 'success', 
        });
        
    } catch (err){
        client.query('ROLLBACK;');
        client.release();
        let status_code = 404;
        let message:string = 'Error in adding a test';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const getTest = async (
    req:Request<{
        course_id: string | null, 
        module_id: string | null, 
        test_id: string | null
    }>, 
    res:Response<NormalResponse & {test: Test | null}>
):Promise<void> => {
    const {course_id, module_id, test_id} = req.params;
    
    try {
        const result = await pool.query<Test>(`
        SELECT 
            test_id, order_num 
        FROM tests 
        WHERE module_id = $1 AND test_id = $2; 
        `, [module_id, test_id]);
        if ( result.rowCount === 0 ){
            throw new CustomError('Test not found', 404);
        }

        const questionRes = await pool.query<Question>(`
        SELECT 
            question, correct_answer, answers, question_id, explanation
        FROM questions
        WHERE test_id = $1 ORDER BY question_id;
        `, [test_id]);
        if ( questionRes.rowCount === 0 ){
            throw new CustomError('No questions found for this test', 404);
        }   
        res.status(200).json({
            status: true, 
            message: 'success', 
            test: {
                ...result.rows[0], 
                questions: questionRes.rows, 
            }
        })
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in getting a test';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
            test: null, 
        });
    }
}

const updateTest = async (
    req:Request<{
        course_id: string | undefined, 
        module_id: string | undefined, 
        test_id: string | undefined
    }, any, {
        added_questions?: Question[] | null | undefined, 
        updated_question: {
            question_id: number | null, 
            question?: string | null, 
            correct_answer?: number | null, 
            answers?: string[] | null, 
            explanation?:string | null, 
        } | null | undefined, 
        deleted_questions?: number[] | null | undefined, 

    }>, 
    res:Response<NormalResponse>
):Promise<void> => {

    const {course_id, module_id, test_id} = req.params;
    const {added_questions, updated_question, deleted_questions} = req.body;
    const added_question_values:string[] = [];
    const updated_question_values:string[] = [];
    
    try {
        if ( added_questions ){
            if ( added_questions.length === 0 ){
                throw new CustomError('No questions to add', 400);
            }
            added_questions.forEach((question) => {
                const {question:q, correct_answer, answers, explanation} = question;
                if ( !q || !correct_answer || !answers ){
                    throw new CustomError('Question, correct answer and answers must be provided', 400);
                }

                if ( answers.length < 2 ){
                    throw new CustomError('At least two answers must be provided', 400);
                }
                if ( correct_answer < 0 || correct_answer > answers.length - 1){
                    throw new CustomError('Correct answer must be a valid index of answers', 400);
                }
                const newAns = answers.map(ans => {
                    return `"${ans}"`;
                });
                added_question_values.push(`
                    ('${q}', ${correct_answer}, '{${newAns.join(',')}}', ${explanation ? `'${explanation}'` : 'null'}, ${test_id})
                `);
            })

            const addedClause = added_question_values.join(', ');
            const result = await pool.query(`
            INSERT INTO questions(question, correct_answer, answers, explanation, test_id)
            VALUES ${addedClause} RETURNING *;
            `);
        }

        if ( updated_question ){
            const {question_id, question, correct_answer, answers, explanation} = updated_question;
            if ( !question_id ){
                throw new CustomError('Question ID must be provided for updating', 400);
            }
            if ( question ){
                updated_question_values.push(`question = '${question}'`);
            }
            if ( correct_answer !== undefined && correct_answer !== null ){
                updated_question_values.push(`correct_answer = ${correct_answer}`);
            }
            if ( answers ){
                if ( answers.length < 2 ){
                    throw new CustomError('At least two answers must be provided', 400);
                }
                const newAns = answers.map(ans => {
                    return `"${ans}"`;
                });
                updated_question_values.push(`answers = '{${newAns.join(',')}}'`);
            }
            if ( explanation ){
                updated_question_values.push(`explanation = '${explanation}'`);
            }
            const updatedClause = updated_question_values.join(', ');
            if ( updatedClause.length === 0){
                throw new CustomError('No fields to update', 400);
            }
            const result = await pool.query(`
            UPDATE questions SET ${updatedClause}
            WHERE question_id = $1 AND test_id = $2; 
            `, [question_id, test_id]);
        }

        if (deleted_questions ){
            if ( deleted_questions.length === 0 ){
                throw new CustomError('No questions to delete', 400);
            }
            const deletedClause = deleted_questions.join(', ');
            const {rowCount} = await pool.query(`
            DELETE FROM questions WHERE question_id IN (${deletedClause}) AND test_id = $1 RETURNING *;  
            `, [test_id]);

            if ( rowCount === 0 ){
                throw new CustomError('No questions detected', 404);
            }

        }

        res.status(200).json({
            status: true, 
            message: 'success', 
        })
    } catch (err) {
        let status_code = 404;
        let message:string = 'Error in getting a test';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        });
    }
}

const deleteTest = async(
    req:Request<{
        course_id:string | undefined, 
        module_id:string | undefined, 
        test_id:string | undefined, 
    }>, 
    res:Response<NormalResponse>
):Promise<void> => {
    const {course_id, module_id, test_id} = req.params;

    try {
        if ( !test_id ){
            throw new CustomError('Test ID must be provided', 400);
        }

        await pool.query(`
        DELETE FROM tests WHERE module_id = $1 AND test_id = $2; 
        `, [module_id, test_id]);

        res.status(200).json({
            status:true, 
            message: 'success', 
        })
    } catch (err){
        let status_code = 404;
        let message:string = 'Error in getting a test';
        if ( err instanceof Error ){
            message = err.message;
            status_code = err instanceof CustomError ? err.status_code : status_code;
        }
        console.log(message, err);
        res.status(status_code).json({
            status: false, 
            message: message, 
        });
    }
}

export { 
    getAllModules, addModule, getModule, updateModule, deleteModule, 
    addResource, updateResource, deleteResource, 
    addTest, getTest, updateTest, deleteTest
}