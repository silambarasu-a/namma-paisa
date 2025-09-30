interface BrandingProps {
  projectName?: string
  emoji?: string
  gradient?: string
}

export function Branding({
  projectName = "Namma Paisa",
  emoji = "🔐",
  gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
}: BrandingProps = {}): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 0;">
          <div style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
          ">
            <span style="font-size: 32px; line-height: 1;">${emoji}</span>
            <h1 style="
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: -0.5px;
              background: ${gradient};
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">
              ${projectName}
            </h1>
          </div>
        </td>
      </tr>
    </table>
  `
}

// For use in email headers with white text
export function BrandingWhite({
  projectName = "Namma Paisa",
  emoji = "🔐",
}: Partial<BrandingProps> = {}): string {
  return `${emoji} ${projectName}`
}
