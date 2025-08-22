import { Request, Response } from "express";
import CustomError from "../error/custom_error";
import { NormalResponse } from "./response_type";
import pool from "../db/pool";

type Message = {
    message: string, 
    sender_id: string, 
    receiver_id: string, 
    created_at: string, 
    updated_at: string,
}

type Chat = {
    chat_id?:string, 
    user_id1:string, 
    user_id2:string, 
    messages?: Message[] | [], 
    created_at?:string, 
    updated_at?:string, 
}

type ChatResponse = NormalResponse & { chat?: Chat | null | {}}
type ChatListResponse = NormalResponse & { chats?: Chat[] | [] }

const addChat = async (
    req:Request<any, any, {user_id1:string | null, user_id2:string | null}>, 
    res:Response<ChatResponse>
) => {
    const { user_id1, user_id2 } = req.body;
    try {
        if ( !user_id1 || !user_id2){
            throw new CustomError('user_id1 and user_id2 are required', 400);
        } 
        if ( user_id1 === user_id2){
            throw new CustomError('user_id1 and user_id2 cannot be the same', 400);
        }

        const result = await pool.query<Chat>(`
        INSERT INTO chats(user_id1, user_id2) VALUES($1, $2) RETURNING *; 
        `, [user_id1, user_id2]);

        if ( result.rowCount === 0 ){
            throw new CustomError('Error in creating chat', 500);
        }

        const chat:Chat = result.rows[0];
        res.status(201).json({
            status:true, 
            message: 'success', 
            chat: chat, 
        })
    } catch (err) {
        let status_code = 500;
        let message = 'Error in creating chat';
        if ( err instanceof Error) 
            message = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const getChat = async (
    req:Request<{chat_id:string}>, 
    res:Response<ChatResponse>
) => {
    const {chat_id} = req.params;
    
    try {
        const result = await pool.query<Chat>(`
        SELECT * FROM chats WHERE chat_id = $1; 
        `, [chat_id]);

        const messages_result = await pool.query(`
        SELECT message, sender_id, receiver_id, created_at, updated_at 
        FROM messages WHERE chat_id = $1 ORDER BY created_at ASC; 
        `, [chat_id]);
        if ( result.rowCount === 0 ){
            throw new CustomError('Chat not found', 501);
        }
        const chat:Chat = result.rows[0];
        const messages:Message[] = messages_result.rows;
        chat.messages = messages;

        res.status(200).json({
            status: true, 
            message: 'success', 
            chat: chat
        });
    } catch (err){
        let status_code = 500;
        let message = 'Error in fetching chat';
        if ( err instanceof Error) 
            message = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const getUserChats = async (
    req:Request<any, any, {decoded_user: {user_id:string, email: string} | null}>, 
    res:Response<ChatListResponse>
) => {
    const {decoded_user} = req.body;
    try {
        if ( !decoded_user || !decoded_user.user_id){
            throw new CustomError('User not authenticated', 401);
        }

        const {user_id} = decoded_user;
        const result = await pool.query<Chat>(`
        SELECT * FROM chats WHERE user_id1 = $1 OR user_id2 = $1; 
        `, [user_id]);

        const chats:Chat[] = result.rows;
        res.status(200).json({
            status: true, 
            message: 'success', 
            chats: chats,
        })
    } catch (err){
        let status_code = 500;
        let message = 'Error in fetching user chats';
        if ( err instanceof Error) 
            message = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const deleteChat = async (
    req:Request<{chat_id:string}>, 
    res:Response<NormalResponse>
) => {
    const {chat_id} = req.params;
    try {
        await pool.query(`
        DELETE FROM messages WHERE chat_id = $1; 
        `, [chat_id]);
    } catch (err) {
        let status_code = 500;
        let message = 'Error in deleting chat';
        if ( err instanceof Error) 
            message = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: message, 
        })
    }
}

const sendMessage = async (
    req:Request<any, any, {chat_id: string, sender_id:string, receiver_id: string, message: string}>, 
    res:Response<NormalResponse & { text_message?:Message | null | {}}>
) => {
    const { chat_id, sender_id, receiver_id, message} = req.body;
    try {
        if ( 
            !chat_id || 
            !sender_id || 
            !receiver_id ||
            !message 
        ) {
            throw new CustomError('chat_id, sender_id, receiver_id and message are required', 400);
        }

        const {rows:chats, rowCount} = await pool.query<Chat>(`
        SELECT chat_id, sender_id, receiver_id FROM chats 
        WHERE chat_id = $1; 
        `);
        if ( rowCount === 0 )
            throw new CustomError('Chat not found', 404);

        const chat = chats[0];
        if ( sender_id !== chat.user_id1 && sender_id !== chat.user_id2)
            throw new CustomError('Sender is not part of the chat', 403);
        if ( receiver_id !== chat.user_id1 && receiver_id !== chat.user_id2)
            throw new CustomError('Receiver is not part of the chat', 403);
        
        if ( sender_id === receiver_id )
            throw new CustomError('Sender and receiver cannot be the same', 400);

        const result = await pool.query<Message>(`
        INSERT INTO messages(chat_id, sender_id, receiver_id, message) 
        VALUES($1, $2, $3, $4) RETURNING message, sender_id, receiver_id, created_at, updated_at;
        `, [chat_id, sender_id, receiver_id, message]);
        const new_message = result.rows[0];
        res.status(201).json({
            status: true, 
            message: 'success', 
            text_message: new_message, 
        })
    } catch (err) {
        let status_code = 500;
        let msg = 'Error in sending message';
        if ( err instanceof Error) 
            msg = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: msg, 
        })
    }
}

const editMessage = async (
    req:Request<{message_id: string}, any, {chat_id: string, sender_id:string, new_message: string}>, 
    res:Response<NormalResponse & { text_message?:Message | null | {}}>
) => {
    const message_id:number = parseInt(req.params.message_id);
    const {chat_id, sender_id, new_message} = req.body;
    try {
        if (
            !chat_id || 
            !sender_id || 
            !new_message
        ){
            throw new CustomError('chat_id, sender_id and new_message are required', 400);
        }

        const result = await pool.query(`
        UPDATE messages SET message = $1, updated_at = NOW()
        WHERE message_id = $2 AND chat_id = $3 AND sender_id = $4
        RETURNING message, sender_id, receiver_id, created_at, updated_at;
        `, [new_message, message_id, chat_id, sender_id]);

        if ( result.rowCount === 0 ){
            throw new CustomError('Message not found or you are not authorized to edit this message', 404);
        }

        res.status(200).json({
            status: true, 
            message: 'success', 
            text_message: result.rows[0]
        });
    } catch (err) {
        let status_code = 500;
        let msg = 'Error in editing message';
        if ( err instanceof Error) 
            msg = err.message;
        if ( err instanceof CustomError)
            status_code = err.status_code;
        res.status(status_code).json({
            status: false, 
            message: msg, 
        })
    }
}