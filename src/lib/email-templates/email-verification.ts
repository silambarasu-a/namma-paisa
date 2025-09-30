import { BaseLayout } from "./components/base-layout"
import { Header } from "./components/header"
import { Footer } from "./components/footer"
import { BrandingWhite } from "./components/branding"

interface EmailVerificationProps {
  verificationLink: string
  name?: string
}

export function EmailVerificationTemplate({ verificationLink, name }: EmailVerificationProps): string {
  const greeting = name ? `Hi ${name},` : "Hello,"

  const content = `
    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">
          Verify Your Email Address
        </h2>

        <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.6;">
          ${greeting}<br><br>
          Thank you for signing up with Namma Paisa! To complete your registration and start managing your finances, please verify your email address by clicking the button below.
        </p>

        <!-- Verification Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td align="center">
              <a href="${verificationLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                text-decoration: none;
                padding: 16px 48px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                letter-spacing: 0.5px;
              ">
                Verify Email Address
              </a>
            </td>
          </tr>
        </table>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
            <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. After verification, you can sign in to your account.
          </p>
        </div>

        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="margin: 0 0 24px; color: #667eea; font-size: 12px; word-break: break-all; line-height: 1.6;">
          ${verificationLink}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
          If you didn't create an account with ${BrandingWhite()}, please ignore this email.
        </p>
      </td>
    </tr>
  `

  return BaseLayout({
    children: Header() + content + Footer(),
  })
}
