import nodemailer from "nodemailer"
import { PasswordResetOTPTemplate } from "./email-templates/password-reset-otp"
import { PasswordResetLinkTemplate } from "./email-templates/password-reset-link"
import { EmailVerificationTemplate } from "./email-templates/email-verification"
import crypto from "crypto"

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export async function sendPasswordResetOTP(email: string, otp: string, name?: string) {
  const emailHtml = PasswordResetOTPTemplate({ otp, name })

  try {
    const info = await transporter.sendMail({
      from: `"Namma Paisa" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset OTP - Namma Paisa",
      html: emailHtml,
    })

    console.log("Email sent successfully:", info.messageId)
    return { success: true, data: info }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}

export async function sendPasswordResetLink(email: string, resetLink: string, name?: string) {
  const emailHtml = PasswordResetLinkTemplate({ resetLink, name })

  try {
    const info = await transporter.sendMail({
      from: `"Namma Paisa" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Link - Namma Paisa",
      html: emailHtml,
    })

    console.log("Password reset link email sent successfully:", info.messageId)
    return { success: true, data: info }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}

export async function sendEmailVerification(email: string, verificationLink: string, name?: string) {
  const emailHtml = EmailVerificationTemplate({ verificationLink, name })

  try {
    const info = await transporter.sendMail({
      from: `"Namma Paisa" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - Namma Paisa",
      html: emailHtml,
    })

    console.log("Email verification sent successfully:", info.messageId)
    return { success: true, data: info }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Namma Paisa" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    })

    console.log("Email sent successfully:", info.messageId)
    return { success: true, data: info }
  } catch (error) {
    console.error("Email sending error:", error)
    return { success: false, error }
  }
}
