import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.GMAIL, 
        pass: process.env.GMAIL_PASSWORD
    }
});

transporter.verify((err, success) => {
    console.log(process.env.GMAIL, process.env.GMAIL_PASSWORD);
    if ( success ){
        console.log("Success connecting nodemailer");
    } else {
        console.log(err?.message);
    }
})

export default transporter;