"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Receipt, AlertCircle, CreditCard as CardIcon, Wallet } from "lucide-react"
import type { CreditCard } from "@/types"

export default function AddExpense() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])

  // Form states
  const [date, setDate] = useState("")
  const [title, setTitle] = useState("")
  const [expenseType, setExpenseType] = useState<"EXPECTED" | "UNEXPECTED">("EXPECTED")
  const [category, setCategory] = useState<"NEEDS" | "PARTIAL_NEEDS" | "AVOID">("NEEDS")
  const [amount, setAmount] = useState("")
  const [needsPortion, setNeedsPortion] = useState("")
  const [avoidPortion, setAvoidPortion] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER">("CASH")
  const [creditCardId, setCreditCardId] = useState("")

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  // Load credit cards
  useEffect(() => {
    const loadCreditCards = async () => {
      try {
        const response = await fetch("/api/credit-cards")
        if (response.ok) {
          const data = await response.json()
          setCreditCards(data.filter((card: CreditCard) => card.isActive))
        }
      } catch (error) {
        console.error("Error loading credit cards:", error)
      }
    }
    loadCreditCards()
  }, [])

  // Auto-calculate total amount for partial-needs
  useEffect(() => {
    if (category === "PARTIAL_NEEDS") {
      const needs = parseFloat(needsPortion) || 0
      const avoid = parseFloat(avoidPortion) || 0
      setAmount((needs + avoid).toString())
    }
  }, [category, needsPortion, avoidPortion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validation
      if (!date || !title || !amount) {
        toast.error("Please fill in all required fields")
        setIsLoading(false)
        return
      }

      if (parseFloat(amount) <= 0) {
        toast.error("Amount must be greater than 0")
        setIsLoading(false)
        return
      }

      if (category === "PARTIAL_NEEDS") {
        const needs = parseFloat(needsPortion) || 0
        const avoid = parseFloat(avoidPortion) || 0

        if (needs <= 0 && avoid <= 0) {
          toast.error("At least one portion must be greater than 0 for partial-needs")
          setIsLoading(false)
          return
        }

        if (Math.abs((needs + avoid) - parseFloat(amount)) > 0.01) {
          toast.error("Needs + Avoid portions must equal the total amount")
          setIsLoading(false)
          return
        }
      }

      // Validate payment method
      if (paymentMethod === "CARD" && !creditCardId) {
        toast.error("Please select a credit card")
        setIsLoading(false)
        return
      }

      // No need to change expense date for credit cards
      // The expense date remains the transaction date
      // Payment due date will be calculated server-side

      const body: {
        date: string;
        title: string;
        expenseType: "EXPECTED" | "UNEXPECTED";
        category: "NEEDS" | "PARTIAL_NEEDS" | "AVOID";
        amount: number;
        needsPortion?: number;
        avoidPortion?: number;
        paymentMethod: string;
        creditCardId?: string;
      } = {
        date,
        title,
        expenseType,
        category,
        amount: parseFloat(amount),
        paymentMethod,
      }

      if (category === "PARTIAL_NEEDS") {
        body.needsPortion = parseFloat(needsPortion) || 0
        body.avoidPortion = parseFloat(avoidPortion) || 0
      }

      if (paymentMethod === "CARD" && creditCardId) {
        body.creditCardId = creditCardId
      }

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success("Expense added successfully!")
        router.push("/expenses")
      } else {
        const data = await response.json()
        toast.error(data.message || "Failed to add expense")
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Add New Expense
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Record a new expense with category classification
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Expense Details</span>
          </CardTitle>
          <CardDescription>
            Fill in the details of your expense. For partial-needs, specify how much goes to needs vs avoid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseType">Type *</Label>
                <Select value={expenseType} onValueChange={(value: "EXPECTED" | "UNEXPECTED") => setExpenseType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPECTED">Expected</SelectItem>
                    <SelectItem value="UNEXPECTED">Unexpected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Grocery shopping, Restaurant meal, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value: "NEEDS" | "PARTIAL_NEEDS" | "AVOID") => {
                setCategory(value)
                // Reset partial amounts when changing category
                if (value !== "PARTIAL_NEEDS") {
                  setNeedsPortion("")
                  setAvoidPortion("")
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEEDS">Needs</SelectItem>
                  <SelectItem value="PARTIAL_NEEDS">Partial-Needs</SelectItem>
                  <SelectItem value="AVOID">Avoid</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Needs:</strong> Essential expenses (groceries, rent, utilities)</p>
                <p><strong>Partial-Needs:</strong> Mixed expenses with both essential and non-essential parts</p>
                <p><strong>Avoid:</strong> Non-essential expenses (entertainment, luxury items)</p>
              </div>
            </div>

            {category === "PARTIAL_NEEDS" ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-200">Partial-Needs Category</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Split this expense into two parts: how much was for actual needs vs avoidable spending.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="needsPortion">Needs Portion (₹) *</Label>
                    <Input
                      id="needsPortion"
                      type="number"
                      step="0.01"
                      min="0"
                      value={needsPortion}
                      onChange={(e) => setNeedsPortion(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Amount that was actually needed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avoidPortion">Avoid Portion (₹) *</Label>
                    <Input
                      id="avoidPortion"
                      type="number"
                      step="0.01"
                      min="0"
                      value={avoidPortion}
                      onChange={(e) => setAvoidPortion(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Amount that could have been avoided
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Auto-calculated from needs + avoid portions
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value: "CASH" | "CARD" | "UPI" | "NET_BANKING" | "OTHER") => {
                  setPaymentMethod(value)
                  if (value !== "CARD") {
                    setCreditCardId("")
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center space-x-2">
                        <Wallet className="h-4 w-4" />
                        <span>Cash</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CARD">
                      <div className="flex items-center space-x-2">
                        <CardIcon className="h-4 w-4" />
                        <span>Credit/Debit Card</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="UPI">
                      <div className="flex items-center space-x-2">
                        <span>UPI</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="NET_BANKING">
                      <div className="flex items-center space-x-2">
                        <span>Net Banking</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center space-x-2">
                        <span>Other</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "CARD" && (
                <div className="space-y-2">
                  <Label htmlFor="creditCard">Select Card *</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit card" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.length === 0 ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                          No active cards found. <a href="/credit-cards" className="text-primary underline">Add a card</a>
                        </div>
                      ) : (
                        creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>
                            {card.bank} - {card.cardName} (••••{card.lastFourDigits})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {creditCardId && creditCards.find(c => c.id === creditCardId) && (
                    <p className="text-xs text-muted-foreground">
                      Billing cycle: {creditCards.find(c => c.id === creditCardId)?.billingCycle}th |
                      Payment due: {creditCards.find(c => c.id === creditCardId)?.dueDate}th
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Adding..." : "Add Expense"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/expenses")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}