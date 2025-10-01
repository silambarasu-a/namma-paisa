import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/authz"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isSuperAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.systemSettings.findMany({
      where: {
        key: {
          in: ["notification_email", "public_contact_email", "public_contact_phone", "public_contact_location"],
        },
      },
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      notificationEmail: settingsMap.notification_email || "",
      publicContactEmail: settingsMap.public_contact_email || "",
      publicContactPhone: settingsMap.public_contact_phone || "",
      publicContactLocation: settingsMap.public_contact_location || "",
    })
  } catch (error) {
    console.error("Error fetching system settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isSuperAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { notificationEmail, publicContactEmail, publicContactPhone, publicContactLocation } = await request.json()

    if (!notificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      return NextResponse.json(
        { error: "Valid notification email is required" },
        { status: 400 }
      )
    }

    // Validate public email if provided
    if (publicContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicContactEmail)) {
      return NextResponse.json(
        { error: "Invalid public contact email format" },
        { status: 400 }
      )
    }

    // Update all settings
    await Promise.all([
      prisma.systemSettings.upsert({
        where: { key: "notification_email" },
        update: {
          value: notificationEmail,
          description: "Email that receives contact form notifications",
        },
        create: {
          key: "notification_email",
          value: notificationEmail,
          description: "Email that receives contact form notifications",
        },
      }),
      prisma.systemSettings.upsert({
        where: { key: "public_contact_email" },
        update: {
          value: publicContactEmail || "",
          description: "Public email displayed on contact page",
        },
        create: {
          key: "public_contact_email",
          value: publicContactEmail || "",
          description: "Public email displayed on contact page",
        },
      }),
      prisma.systemSettings.upsert({
        where: { key: "public_contact_phone" },
        update: {
          value: publicContactPhone || "",
          description: "Public phone number displayed on contact page",
        },
        create: {
          key: "public_contact_phone",
          value: publicContactPhone || "",
          description: "Public phone number displayed on contact page",
        },
      }),
      prisma.systemSettings.upsert({
        where: { key: "public_contact_location" },
        update: {
          value: publicContactLocation || "",
          description: "Public location displayed on contact page",
        },
        create: {
          key: "public_contact_location",
          value: publicContactLocation || "",
          description: "Public location displayed on contact page",
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating system settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
