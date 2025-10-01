import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendEmail } from "@/lib/email"

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ["public_contact_email", "public_contact_phone", "public_contact_location"],
        },
      },
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      email: settingsMap.public_contact_email || "",
      phone: settingsMap.public_contact_phone || "",
      location: settingsMap.public_contact_location || "",
    })
  } catch (error) {
    console.error("Error fetching contact info:", error)
    return NextResponse.json(
      { error: "Failed to fetch contact info" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = contactSchema.parse(body)

    // Save contact message to database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    })

    // Get notification email from system settings
    const notificationEmailSetting = await prisma.systemSettings.findUnique({
      where: { key: "notification_email" },
    })

    const contactEmail = notificationEmailSetting?.value || process.env.CONTACT_EMAIL || process.env.EMAIL_FROM

    if (contactEmail) {
      // Send notification email to admin
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B5CF6;">New Contact Form Submission</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="margin-top: 20px;">
              <strong>Message:</strong>
              <p style="background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px;">
                ${message}
              </p>
            </div>
          </div>
          <p style="color: #666; font-size: 12px;">
            Reply to: <a href="mailto:${email}">${email}</a>
          </p>
        </div>
      `

      await sendEmail({
        to: contactEmail,
        subject: `Contact Form: ${subject}`,
        html: emailHtml,
        text: `New contact form submission from ${name} (${email})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
      })
    }

    return NextResponse.json(
      {
        message: "Message sent successfully. We'll get back to you soon!",
        id: contactMessage.id,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    console.error("Contact form error:", error)
    return NextResponse.json(
      { message: "Failed to send message. Please try again later." },
      { status: 500 }
    )
  }
}
