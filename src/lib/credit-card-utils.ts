/**
 * Credit Card Utility Functions
 * Handles billing cycle and payment due date calculations
 */

interface CreditCard {
  billingCycle: number; // Day of month when billing cycle closes (1-31)
  dueDate: number; // Day of month when payment is due
}

/**
 * Calculates the payment due date for a credit card expense
 *
 * Logic:
 * 1. If transaction date is on or before billing cycle day, payment is due in the same month
 * 2. If transaction date is after billing cycle day, payment is due in the next month
 *
 * Example:
 * - Card billing cycle: 5th of month, due date: 20th
 * - Transaction on Jan 3rd → Due on Jan 20th
 * - Transaction on Jan 7th → Due on Feb 20th
 *
 * @param transactionDate - Date when the expense was made
 * @param creditCard - Credit card details with billingCycle and dueDate
 * @returns Date when payment is due
 */
export function calculatePaymentDueDate(
  transactionDate: Date,
  creditCard: CreditCard
): Date {
  const txnDate = new Date(transactionDate)
  const txnDay = txnDate.getDate()
  const txnMonth = txnDate.getMonth()
  const txnYear = txnDate.getFullYear()

  // Determine which billing cycle this transaction falls into
  let dueMonth = txnMonth
  let dueYear = txnYear

  // If transaction is after billing cycle day, it belongs to next month's cycle
  if (txnDay > creditCard.billingCycle) {
    dueMonth++
    if (dueMonth > 11) {
      dueMonth = 0
      dueYear++
    }
  }

  // Create the due date
  let dueDay = creditCard.dueDate

  // Handle case where due date might not exist in the month (e.g., 31st in February)
  const lastDayOfDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate()
  if (dueDay > lastDayOfDueMonth) {
    dueDay = lastDayOfDueMonth
  }

  return new Date(dueYear, dueMonth, dueDay)
}

/**
 * Formats the payment due date for display
 *
 * @param dueDate - Date when payment is due
 * @returns Formatted string (e.g., "Jan 20, 2025")
 */
export function formatPaymentDueDate(dueDate: Date): string {
  return dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Checks if a payment is overdue
 *
 * @param dueDate - Date when payment is due
 * @param gracePeriod - Grace period in days (default: 0)
 * @returns true if payment is overdue
 */
export function isPaymentOverdue(dueDate: Date, gracePeriod: number = 0): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDateWithGrace = new Date(dueDate)
  dueDateWithGrace.setDate(dueDateWithGrace.getDate() + gracePeriod)
  dueDateWithGrace.setHours(0, 0, 0, 0)

  return today > dueDateWithGrace
}

/**
 * Gets the number of days until payment is due
 *
 * @param dueDate - Date when payment is due
 * @returns Number of days (negative if overdue)
 */
export function getDaysUntilDue(dueDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}
