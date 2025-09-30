import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (error: any) {
    // If error is BLOCKED_USER, return 403
    if (error?.message === "BLOCKED_USER") {
      return NextResponse.json({ error: "User blocked" }, { status: 403 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
