/**
 * Budget and Allocation Utility Functions
 * Calculates available amounts for expenses and investments based on budget/allocation settings
 */

import type { ExpenseBudget, InvestmentAllocation } from "@/types"

/**
 * Calculate available amount for expenses based on budget settings
 * If budget is set, returns the budgeted amount
 * Otherwise, returns the available surplus after deductions
 */
export function calculateAvailableForExpenses(
  availableSurplus: number,
  budget: ExpenseBudget | null
): {
  availableForExpenses: number
  expectedBudget: number
  unexpectedBudget: number
  isUsingBudget: boolean
} {
  if (!budget) {
    return {
      availableForExpenses: availableSurplus,
      expectedBudget: 0,
      unexpectedBudget: 0,
      isUsingBudget: false,
    }
  }

  let expectedBudget = 0
  let unexpectedBudget = 0

  // Calculate expected budget
  if (budget.expectedPercent !== null && budget.expectedPercent !== undefined) {
    expectedBudget = (availableSurplus * budget.expectedPercent) / 100
  } else if (budget.expectedAmount !== null && budget.expectedAmount !== undefined) {
    expectedBudget = budget.expectedAmount
  }

  // Calculate unexpected budget
  if (budget.unexpectedPercent !== null && budget.unexpectedPercent !== undefined) {
    unexpectedBudget = (availableSurplus * budget.unexpectedPercent) / 100
  } else if (budget.unexpectedAmount !== null && budget.unexpectedAmount !== undefined) {
    unexpectedBudget = budget.unexpectedAmount
  }

  const totalBudget = expectedBudget + unexpectedBudget

  // If budget is configured (any value set), use it
  const hasBudget =
    budget.expectedPercent !== null || budget.expectedAmount !== null ||
    budget.unexpectedPercent !== null || budget.unexpectedAmount !== null

  return {
    availableForExpenses: hasBudget ? totalBudget : availableSurplus,
    expectedBudget,
    unexpectedBudget,
    isUsingBudget: hasBudget,
  }
}

/**
 * Calculate available amount for investments based on allocation settings
 * If allocation is set, returns the allocated amount
 * Otherwise, returns the remaining surplus after expenses
 */
export function calculateAvailableForInvestment(
  availableSurplus: number,
  allocations: InvestmentAllocation[] | null,
  actualExpenses: number = 0
): {
  availableForInvestment: number
  allocationBreakdown: { bucket: string; amount: number }[]
  isUsingAllocation: boolean
} {
  const hasAllocations = allocations && allocations.length > 0

  if (!hasAllocations) {
    // No allocation set, use remaining surplus after expenses
    return {
      availableForInvestment: Math.max(0, availableSurplus - actualExpenses),
      allocationBreakdown: [],
      isUsingAllocation: false,
    }
  }

  // Calculate total allocated amount based on type
  let totalAllocated = 0
  const allocationBreakdown = allocations!.map(allocation => {
    let amount = 0
    if (allocation.allocationType === "PERCENTAGE" && allocation.percent) {
      amount = (availableSurplus * Number(allocation.percent)) / 100
    } else if (allocation.allocationType === "AMOUNT" && allocation.customAmount) {
      amount = Number(allocation.customAmount)
    }
    totalAllocated += amount

    return {
      bucket: allocation.bucket,
      amount,
      type: allocation.allocationType,
    }
  })

  return {
    availableForInvestment: totalAllocated,
    allocationBreakdown,
    isUsingAllocation: true,
  }
}

/**
 * Calculate comprehensive financial summary with budget and allocation logic
 */
export function calculateFinancialSummary(
  income: number,
  tax: number,
  loans: number,
  sips: number,
  expenses: number,
  budget: ExpenseBudget | null,
  allocations: InvestmentAllocation[] | null,
  oneTimeInvestments: number = 0,
  sipExecutions: number = 0,
  paidEMIs: number = 0,
  additionalEMIPaid: number = 0
) {
  const afterTax = income - tax
  const afterLoans = afterTax - loans
  const afterSIPs = afterLoans - sips

  // This is the base amount available for expenses and investments
  const availableSurplus = afterSIPs

  // Calculate expense amounts
  const expenseCalc = calculateAvailableForExpenses(availableSurplus, budget)

  // Calculate investment amounts
  const investmentCalc = calculateAvailableForInvestment(
    availableSurplus,
    allocations,
    expenses
  )

  // Calculate total investments made (SIPs + one-time purchases + executed SIPs)
  const totalInvestmentsMade = sips + oneTimeInvestments + sipExecutions

  // PLANNED SURPLUS (after scheduled/planned deductions)
  // This shows what's left after: Tax, Scheduled EMIs, Planned SIPs, and Expenses
  const plannedSurplus = availableSurplus - expenses

  // ACTUAL CASH REMAINING (after all actual transactions)
  // This accounts for what actually happened vs what was planned
  // Start with income and deduct ALL actual outflows:
  const afterActualTax = income - tax

  // Use actual paid EMIs instead of scheduled
  const afterActualEMIs = afterActualTax - paidEMIs

  // For SIPs, use successful executions if available, otherwise use planned
  const actualSIPAmount = sipExecutions > 0 ? sipExecutions : sips
  const afterActualSIPs = afterActualEMIs - actualSIPAmount

  // Deduct actual expenses and one-time investments
  const cashRemaining = afterActualSIPs - expenses - oneTimeInvestments

  // Calculate what additional transactions were made beyond planned
  // This includes:
  // 1. One-time investments (always additional)
  // 2. EMI payments for months OTHER than current month (old dues, advance payments)
  const additionalTransactions = oneTimeInvestments + additionalEMIPaid

  return {
    income,
    tax,
    afterTax,
    loans,
    afterLoans,
    sips,
    afterSIPs,
    availableSurplus,

    // Expense calculations
    availableForExpenses: expenseCalc.availableForExpenses,
    expectedBudget: expenseCalc.expectedBudget,
    unexpectedBudget: expenseCalc.unexpectedBudget,
    isUsingBudget: expenseCalc.isUsingBudget,
    actualExpenses: expenses,

    // Investment calculations
    availableForInvestment: investmentCalc.availableForInvestment,
    investmentAllocationBreakdown: investmentCalc.allocationBreakdown,
    isUsingAllocation: investmentCalc.isUsingAllocation,
    totalInvestmentsMade,
    oneTimeInvestments,
    sipExecutions,

    // Loan payments
    paidEMIs,
    scheduledEMIs: loans,

    // Two types of surplus
    plannedSurplus,        // After scheduled EMI, planned SIPs, and expenses
    cashRemaining,         // After all actual transactions (paid EMIs, executed SIPs, investments, etc.)
    surplus: plannedSurplus,  // Keep this for backward compatibility
    additionalTransactions,
  }
}
