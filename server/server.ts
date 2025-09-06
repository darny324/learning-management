import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from 'cors';
import {Student} from '../types'
import connectDB from "./db/connectDB";
import { AuthorizedRouter, ChatRouter, CourseRouter, EnrollmentRouter, ModuleRouter, UserRouter } from './routes';
import authorizationMiddleware from './middleware/authorization';
import { httpServer, io } from './socket';


const app:express.Express = express();

// initizlize


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// routes



app.get('/', (req, res) => {
    res.json({message: "Welcome to the learning management system API"});
});

// middleware


app.use('/api/v1/learning-management/users', UserRouter);
app.use('/api/v1/learning-management/courses', CourseRouter);
app.use('/api/v1/learning-management/courses/:course_id/modules', authorizationMiddleware, ModuleRouter);
app.use('/api/v1/learning-management/enrollments', authorizationMiddleware, EnrollmentRouter);
app.use('/api/v1/learning-management/chats', authorizationMiddleware, ChatRouter);
app.use('/api/v1/learning-management/authorized-user', authorizationMiddleware, AuthorizedRouter);

app.use((req, res) => {
    res.status(404).json({
        status:false, 
        message: 'Endpoint not found',
    })
});


// 

const port = process.env.PORT || 5000;

async function start() {
    try {
        await connectDB('./models/schema.sql');
        app.listen(port, () => {
            console.log("Server is running on port " + port);
        })
        httpServer.listen(3000, () => {
            console.log('Socket Server is Running on port ' + 3000);
        })
    } catch (err) {
        console.error("Error in starting the server: ", err);
    }
}

start();

let room:Map<string, string> = new Map();

io.on('connection', (socket) => {
    socket.on('join-socket', (data:{user_id?:string}) => {
        const {user_id} = data;
        if ( !user_id )
            socket.emit('serverResponse', 'Error in Joining Socket');
        room.set(user_id as string, socket.id);
    });

    socket.on('send-message', (data:{receiver_id:string | null, chat_id:string | null}) => {
        const {receiver_id, chat_id} = data;
        if (receiver_id && chat_id){
            const receiverSocket = room.get(receiver_id);
            if ( receiverSocket )
                socket.to(receiverSocket).emit('receive-message', {chat_id});
        }
    });

    socket.on('block', (data:{receiver_id:string | null, chat_id:string | null}) => {
        const {receiver_id, chat_id} = data;
        if (receiver_id && chat_id){
            const receiverSocket = room.get(receiver_id);
            if ( receiverSocket )
                socket.to(receiverSocket).emit('get-blocked', {chat_id});
        }
    })

    socket.on('unblock', (data:{receiver_id:string | null, chat_id:string | null}) => {
        const {receiver_id, chat_id} = data;
        if (receiver_id && chat_id){
            const receiverSocket = room.get(receiver_id);
            if ( receiverSocket )
                socket.to(receiverSocket).emit('get-unblocked', {chat_id});
        }
    })

    socket.on('delete', (data:{receiver_id:string | null, chat_id:string | null}) => {
        const {receiver_id, chat_id} = data;
        if (receiver_id && chat_id){
            const receiverSocket = room.get(receiver_id);
            if ( receiverSocket )
                socket.to(receiverSocket).emit('deleted-chat', {chat_id});
        }
    });

    socket.on('disconnect', () => {
        socket.disconnect();
    })
});
