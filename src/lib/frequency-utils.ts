import { SIPFrequency } from "@/types/investment"

/**
 * Convert any SIP frequency amount to monthly equivalent
 * @param amount - The SIP amount
 * @param frequency - The SIP frequency
 * @returns The monthly equivalent amount
 */
export function convertToMonthlyAmount(amount: number, frequency: SIPFrequency): number {
  switch (frequency) {
    case "DAILY":
      return amount * 30 // Approximate: 30 days per month
    case "WEEKLY":
      return amount * 4.33 // Approximate: 4.33 weeks per month
    case "MONTHLY":
      return amount
    case "QUARTERLY":
      return amount / 3
    case "HALF_YEARLY":
      return amount / 6
    case "YEARLY":
      return amount / 12
    case "CUSTOM":
      return amount // Assume monthly for custom
    default:
      return amount
  }
}

/**
 * Get the display label for a frequency
 * @param frequency - The SIP frequency
 * @returns The display label
 */
export function getFrequencyLabel(frequency: SIPFrequency): string {
  switch (frequency) {
    case "DAILY":
      return "Daily"
    case "WEEKLY":
      return "Weekly"
    case "MONTHLY":
      return "Monthly"
    case "QUARTERLY":
      return "Quarterly"
    case "HALF_YEARLY":
      return "Half-Yearly"
    case "YEARLY":
      return "Yearly"
    case "CUSTOM":
      return "Custom"
    default:
      return frequency
  }
}

/**
 * Get the number of occurrences per year for a frequency
 * @param frequency - The SIP frequency
 * @returns The number of occurrences per year
 */
export function getOccurrencesPerYear(frequency: SIPFrequency): number {
  switch (frequency) {
    case "DAILY":
      return 365
    case "WEEKLY":
      return 52
    case "MONTHLY":
      return 12
    case "QUARTERLY":
      return 4
    case "HALF_YEARLY":
      return 2
    case "YEARLY":
      return 1
    case "CUSTOM":
      return 12 // Assume monthly for custom
    default:
      return 12
  }
}

/**
 * Convert monthly amount to the specified frequency
 * @param monthlyAmount - The monthly amount
 * @param frequency - The target frequency
 * @returns The amount in the target frequency
 */
export function convertFromMonthlyAmount(monthlyAmount: number, frequency: SIPFrequency): number {
  switch (frequency) {
    case "DAILY":
      return monthlyAmount / 30
    case "WEEKLY":
      return monthlyAmount / 4.33
    case "MONTHLY":
      return monthlyAmount
    case "QUARTERLY":
      return monthlyAmount * 3
    case "HALF_YEARLY":
      return monthlyAmount * 6
    case "YEARLY":
      return monthlyAmount * 12
    case "CUSTOM":
      return monthlyAmount
    default:
      return monthlyAmount
  }
}

/**
 * Calculate the amount that will be invested in a specific month for a SIP
 * @param amount - The SIP amount
 * @param frequency - The SIP frequency
 * @param startDate - The SIP start date
 * @param targetMonth - The target month (0-11)
 * @param targetYear - The target year
 * @returns The amount that will be invested in the target month
 */
export function getAmountForMonth(
  amount: number,
  frequency: SIPFrequency,
  startDate: Date,
  targetMonth: number,
  targetYear: number
): number {
  const start = new Date(startDate)
  const monthsSinceStart = (targetYear - start.getFullYear()) * 12 + (targetMonth - start.getMonth())

  switch (frequency) {
    case "DAILY":
      // Approximate days in month
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
      return amount * daysInMonth
    case "WEEKLY":
      // Approximate 4-5 weeks per month
      return amount * 4.33
    case "MONTHLY":
      return amount
    case "QUARTERLY":
      // Only invest if it's a quarter month (every 3 months)
      return monthsSinceStart % 3 === 0 ? amount : 0
    case "HALF_YEARLY":
      // Only invest if it's a half-year month (every 6 months)
      return monthsSinceStart % 6 === 0 ? amount : 0
    case "YEARLY":
      // Only invest if it's the same month as start date
      return targetMonth === start.getMonth() ? amount : 0
    case "CUSTOM":
      // Assume monthly for custom
      return amount
    default:
      return amount
  }
}
