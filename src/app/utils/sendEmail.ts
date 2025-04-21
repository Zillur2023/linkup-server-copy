import nodemailer from 'nodemailer';
import config from '../config';

export const sendEmail = async (to: string, html: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: config.NODE_ENV === 'production', // Use TLS in production
    auth: {
      user: 'zillurrahmanbd12@gmail.com',
      pass: config.send_email_secret
    },
  });

  try {
    await transporter.sendMail({
      from: "zillurrahmanbd12@gmail.com", // sender address
      to, // list of receivers
      subject: 'Reset your password within ten minutes!', // Subject line
      text: '', // plain text body
      html, // HTML body
    });
  } catch (error) {
    console.error(`Error sending email: ${error}`);
  }

};
