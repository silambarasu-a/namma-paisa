import { BaseLayout } from "./components/base-layout"
import { Header } from "./components/header"
import { Footer } from "./components/footer"
import { BrandingWhite } from "./components/branding"

interface PasswordResetOTPProps {
  otp: string
  name?: string
}

export function PasswordResetOTPTemplate({ otp, name }: PasswordResetOTPProps): string {
  const greeting = name ? `Hi ${name},` : "Hello,"

  const content = `
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
          Password Reset Request
        </h2>

        <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
          ${greeting}<br><br>
          We received a request to reset your password. Use the OTP code below to proceed with resetting your password.
        </p>

        <!-- OTP Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td align="center" style="background-color: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 30px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                Your OTP Code
              </p>
              <p style="margin: 0; color: #111827; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </p>
            </td>
          </tr>
        </table>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
            <strong>⚠️ Security Notice:</strong> This OTP will expire in 15 minutes. Never share this code with anyone.
          </p>
        </div>

        <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.6;">
          If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
          This is an automated message from ${BrandingWhite()}. Please do not reply to this email.
        </p>
      </td>
    </tr>
  `

  return BaseLayout({
    children: Header() + content + Footer(),
  })
}
