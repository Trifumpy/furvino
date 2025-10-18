import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
    throw new Error("SMTP env vars missing: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM");
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) return;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM!,
    to: recipients.join(","),
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, " "),
    replyTo,
  });
}


