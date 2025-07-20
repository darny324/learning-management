import pool from "./pool"
import file from 'fs'
const connectDB = async (path:string):Promise<void> => {
    try {
        const schema = file.readFileSync(path, {encoding: 'utf-8', flag: 'r'} );
        await pool.query(schema);
    } catch (err) {
        if ( err instanceof Error){
            console.log(err.message + ": ", err);
        }
        console.log("Error in loading database", err);
    }
}

export default connectDB;