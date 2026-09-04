import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const sendEmail = async ({ to, subject, html }) => {
  if (!env.email.host || !env.email.user || !env.email.password) {
    console.log("\n[EMAIL - DEV MODE, not actually sent]");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}\n`);
    return { devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: Number(env.email.port) === 465,
    auth: {
      user: env.email.user,
      pass: env.email.password,
    },
  });

  return transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
  });
};

export default sendEmail;