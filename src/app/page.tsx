import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/authz"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session && isSuperAdmin(session)) {
    redirect("/admin")
  }

  redirect("/dashboard")
}