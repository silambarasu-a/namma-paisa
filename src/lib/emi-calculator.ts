/**
 * EMI Calculator Utility
 * Calculates EMI amount or tenure based on loan details
 */

import type { EMIFrequency } from "@/constants"

interface EMICalculationInput {
  principalAmount: number
  interestRate: number // Annual interest rate in percentage
  tenure?: number // Number of payments
  emiAmount?: number // EMI amount per payment
  frequency: EMIFrequency
}

/**
 * Get number of payments per year based on frequency
 */
function getPaymentsPerYear(frequency: EMIFrequency): number {
  switch (frequency) {
    case "MONTHLY":
      return 12
    case "QUARTERLY":
      return 4
    case "HALF_YEARLY":
      return 2
    case "ANNUALLY":
      return 1
    case "CUSTOM":
      return 12 // Default to monthly for custom
    default:
      return 12
  }
}

/**
 * Calculate EMI amount based on principal, interest rate, and tenure
 * Formula: EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
 * Where:
 * - P = Principal loan amount
 * - R = Interest rate per payment period (annual rate / payments per year / 100)
 * - N = Number of installments
 */
export function calculateEMI(input: Omit<EMICalculationInput, "emiAmount">): number {
  const { principalAmount, interestRate, tenure, frequency } = input;

  if (!tenure || tenure <= 0) return 0;

  // If interest rate is 0, EMI is just principal divided by tenure
  if (interestRate === 0) {
    return Math.round((principalAmount / tenure) * 100) / 100;
  }

  // Get payments per year based on frequency
  const paymentsPerYear = getPaymentsPerYear(frequency);

  // Calculate interest rate per payment period
  const ratePerPeriod = interestRate / paymentsPerYear / 100;

  // EMI Formula: [P x R x (1+R)^N] / [(1+R)^N-1]
  const onePlusR = 1 + ratePerPeriod;
  const onePlusRPowerN = Math.pow(onePlusR, tenure);

  const emi = (principalAmount * ratePerPeriod * onePlusRPowerN) / (onePlusRPowerN - 1);

  return Math.round(emi * 100) / 100;
}




/**
 * Calculate tenure based on principal, interest rate, and EMI amount
 * Derived from: N = log[(EMI) / (EMI - P*R)] / log(1+R)
 */
export function calculateTenure(input: Omit<EMICalculationInput, "tenure">): number {
  const { principalAmount, interestRate, emiAmount, frequency } = input

  if (!emiAmount || emiAmount <= 0) {
    return 0
  }

  // If interest rate is 0, tenure is principal / emi
  if (interestRate === 0) {
    return Math.ceil(principalAmount / emiAmount)
  }

  // Get payments per year
  const paymentsPerYear = getPaymentsPerYear(frequency)

  // Convert annual interest rate to rate per payment period
  const ratePerPeriod = interestRate / paymentsPerYear / 100

  // Check if EMI is sufficient to cover at least the interest
  const minEMI = principalAmount * ratePerPeriod
  if (emiAmount <= minEMI) {
    // EMI is too low, would take infinite time
    return 0
  }

  // Calculate tenure using logarithmic formula
  const numerator = Math.log(emiAmount / (emiAmount - principalAmount * ratePerPeriod))
  const denominator = Math.log(1 + ratePerPeriod)

  const tenure = numerator / denominator

  return Math.ceil(tenure) // Round up to next whole number
}

/**
 * Calculate total interest payable
 */
export function calculateTotalInterest(
  principalAmount: number,
  emiAmount: number,
  tenure: number
): number {
  const totalPayment = emiAmount * tenure
  const totalInterest = totalPayment - principalAmount

  return Math.round(totalInterest * 100) / 100
}

/**
 * Validate and auto-calculate missing field (either EMI or tenure)
 */
export function autoCalculateLoanField(input: EMICalculationInput): {
  emiAmount: number
  tenure: number
  totalInterest: number
  totalPayment: number
} {
  let calculatedEMI = input.emiAmount || 0
  let calculatedTenure = input.tenure || 0

  // If both are provided, use them as-is
  if (input.emiAmount && input.tenure) {
    calculatedEMI = input.emiAmount
    calculatedTenure = input.tenure
  }
  // If only tenure is provided, calculate EMI
  else if (input.tenure && !input.emiAmount) {
    calculatedEMI = calculateEMI({
      principalAmount: input.principalAmount,
      interestRate: input.interestRate,
      tenure: input.tenure,
      frequency: input.frequency,
    })
    calculatedTenure = input.tenure
  }
  // If only EMI is provided, calculate tenure
  else if (input.emiAmount && !input.tenure) {
    calculatedTenure = calculateTenure({
      principalAmount: input.principalAmount,
      interestRate: input.interestRate,
      emiAmount: input.emiAmount,
      frequency: input.frequency,
    })
    calculatedEMI = input.emiAmount
  }
  // If neither is provided, return zeros
  else {
    return {
      emiAmount: 0,
      tenure: 0,
      totalInterest: 0,
      totalPayment: 0,
    }
  }

  const totalInterest = calculateTotalInterest(
    input.principalAmount,
    calculatedEMI,
    calculatedTenure
  )
  const totalPayment = calculatedEMI * calculatedTenure

  return {
    emiAmount: calculatedEMI,
    tenure: calculatedTenure,
    totalInterest,
    totalPayment,
  }
}
