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
  emiAmount: number
  dueDate: string
  isPaid: boolean
}

export interface Loan {
  id: string
  loanType: string
  institution: string
  principalAmount: number
  emiAmount: number
  currentOutstanding: number
  isActive: boolean
  startDate: string
  tenure: number
  interestRate: number
  emis: EMI[]
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
