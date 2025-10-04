// Expense types
export interface CreditCardReference {
  cardName: string
  bank: string
  lastFourDigits: string
  billingCycle: number
  dueDate: number
}

export interface Expense {
  id: string
  date: string
  title: string
  description?: string | null
  expenseType: "EXPECTED" | "UNEXPECTED"
  category: "NEEDS" | "PARTIAL_NEEDS" | "AVOID"
  amount: number
  needsPortion?: number
  avoidPortion?: number
  paymentMethod: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER"
  paymentDueDate?: string
  creditCardId?: string | null
  creditCard?: CreditCardReference
  createdAt: string
}

export interface ExpenseSummary {
  totalExpenses: number
  needsTotal: number
  avoidTotal: number
  expectedTotal: number
  unexpectedTotal: number
  count: number
}

export interface ExpenseBudget {
  expectedPercent?: number | null
  expectedAmount?: number | null
  unexpectedPercent?: number | null
  unexpectedAmount?: number | null
}

// Income types
export interface Income {
  id: string
  date: string
  title: string
  description?: string
  amount: number
  category: string
  isRecurring: boolean
  createdAt: string
}

export interface Salary {
  id: string
  monthly: number
  effectiveFrom: string
  effectiveTo?: string
}

// Loan types
export interface EMI {
  id: string
  installmentNumber: number
  emiAmount: number
  paidAmount?: number
  dueDate: string
  paidDate?: string
  isPaid: boolean
  principalPaid?: number
  interestPaid?: number
  lateFee?: number
  paymentMethod?: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER"
  paymentNotes?: string
}

export interface PaymentScheduleDate {
  month: number  // 1-12
  day: number    // 1-31
}

export interface PaymentSchedule {
  dates: PaymentScheduleDate[]  // Array of month-day combinations
}

export interface GoldLoanItem {
  id: string
  title: string
  carat: number
  quantity: number
  grossWeight: number
  netWeight: number
  loanAmount?: number
}

export interface Loan {
  id: string
  loanType: string
  institution: string
  accountHolderName: string
  principalAmount: number
  emiAmount: number
  emiFrequency: "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "ANNUALLY" | "CUSTOM"
  customPaymentDay?: number
  paymentSchedule?: PaymentSchedule
  currentOutstanding: number
  totalPaid: number
  isActive: boolean
  isClosed: boolean
  closedAt?: string
  startDate: string
  tenure: number
  remainingTenure?: number
  interestRate: number
  accountNumber?: string | null
  description?: string | null
  emis: EMI[]
  goldItems?: GoldLoanItem[]
}

// Credit card types
export interface CreditCard {
  id: string
  cardName: string
  lastFourDigits: string
  bank: string
  billingCycle: number
  dueDate: number
  gracePeriod: number
  cardNetwork?: string
  cardLimit?: number
  isActive: boolean
}
