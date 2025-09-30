interface HeaderProps {
  title?: string
}

export function Header({ title = "Namma Paisa" }: HeaderProps = {}): string {
  return `
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
          🔐 ${title}
        </h1>
      </td>
    </tr>
  `
}
