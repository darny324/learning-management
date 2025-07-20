import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import cors from 'cors';
import {Student} from '../types'
import connectDB from "./db/connectDB";
import { ChatRouter, CourseRouter, EnrollmentRouter, ModuleRouter, StudentRouter, TeacherRouter, TestRouter } from './routes';
import authorizationMiddleware from './middleware/authorization';


const app:express.Express = express();

// initizlize


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

// routes
app.get('/', (req, res) => {
    res.json({message: "Welcome to the learning management system API"});
})

// middleware


app.use('/api/v1/learning-management/students', StudentRouter);
app.use('/api/v1/learning-management/teachers', TeacherRouter);
app.use('/api/v1/learning-management/courses', CourseRouter);
app.use('/api/v1/learning-management/courses/:courseId/modules', ModuleRouter);
app.use('/api/v1/learning-management/tests', TestRouter);
app.use('/api/v1/learning-management/enrollments', EnrollmentRouter);
app.use('/api/v1/learning-management/chats', ChatRouter);


// 

const port = process.env.PORT || 5000;

async function start() {
    try {
        await connectDB('./models/schema.sql');
        app.listen(port, () => {
            console.log("Server is runnign on port " + port);
        })
    } catch (err) {
        console.error("Error in starting the server: ", err);
    }
}

start();


