import { Router } from "express";
import { addChat, deleteChat, deleteMessage, editMessage, getChat, getUserChats, sendMessage } from "../controllers/chat";

const router = Router();

router.route('/')
.post(addChat)
.get(getUserChats);

router.route('/:chat_id')
.get(getChat)
.delete(deleteChat);

router.route('/:chat_id/messages')
.post(sendMessage);

router.route('/:chat_id/messages/:message_id')
.patch(editMessage)
.delete(deleteMessage);

export default router;