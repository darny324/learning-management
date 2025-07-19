import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import {Student} from '../types'
dotenv.config();

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



// 

const port = process.env.PORT || 5000;

async function start() {
    try {
        app.listen(port, () => {
            console.log("Server is runnign on port " + port);
        })
    } catch (err) {
        console.error("Error in starting the server: ", err);
    }
}

start();


