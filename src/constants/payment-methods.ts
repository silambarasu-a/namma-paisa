import type { SelectOption } from "@/types"

export const PAYMENT_METHODS: readonly SelectOption[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "NET_BANKING", label: "Net Banking" },
  { value: "OTHER", label: "Other" },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"]
