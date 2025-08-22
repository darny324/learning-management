import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from 'cors';
import {Student} from '../types'
import connectDB from "./db/connectDB";
import { AuthorizedRouter, ChatRouter, CourseRouter, EnrollmentRouter, ModuleRouter, UserRouter } from './routes';
import authorizationMiddleware from './middleware/authorization';


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
    } catch (err) {
        console.error("Error in starting the server: ", err);
    }
}

start();


