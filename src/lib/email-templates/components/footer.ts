export function Footer(): string {
  const currentYear = new Date().getFullYear()

  return `
    <tr>
      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
          © ${currentYear} Namma Paisa. All rights reserved.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          Your personal finance companion
        </p>
      </td>
    </tr>
  `
}
