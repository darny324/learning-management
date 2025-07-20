import { Pool } from "pg";


const pool = new Pool({
    user: process.env.DB_USER,
    host: 'localhost',
    password: process.env.DB_PASSWORD, 
    max: 20, 
    maxLifetimeSeconds: 60, 
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT as string), 
});



export default pool;