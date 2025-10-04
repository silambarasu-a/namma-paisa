import { prisma } from "@/lib/prisma"

/**
 * Check if a specific month is closed for a user
 */
export async function isMonthClosed(userId: string, date: Date): Promise<boolean> {
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  const snapshot = await prisma.monthlySnapshot.findUnique({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
    select: {
      isClosed: true,
    },
  })

  return snapshot?.isClosed ?? false
}

/**
 * Validate that a date is not in a closed month
 * Throws an error if the month is closed
 */
export async function validateMonthNotClosed(userId: string, date: Date, action: string = "perform this action"): Promise<void> {
  const closed = await isMonthClosed(userId, date)
  if (closed) {
    const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    throw new Error(`Cannot ${action} in ${month} - this month has been closed. Please select a future month.`)
  }
}
