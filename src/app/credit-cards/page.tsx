"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CreditCard as CardIcon, Plus, Edit, Trash2, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CreditCard {
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

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentCard, setCurrentCard] = useState<CreditCard | null>(null)

  // Form state
  const [cardName, setCardName] = useState("")
  const [lastFourDigits, setLastFourDigits] = useState("")
  const [bank, setBank] = useState("")
  const [billingCycle, setBillingCycle] = useState("1")
  const [dueDate, setDueDate] = useState("15")
  const [gracePeriod, setGracePeriod] = useState("3")
  const [cardNetwork, setCardNetwork] = useState("")
  const [cardLimit, setCardLimit] = useState("")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      const response = await fetch("/api/credit-cards")
      if (response.ok) {
        const data = await response.json()
        setCards(data)
      }
    } catch (error) {
      console.error("Error loading cards:", error)
      toast.error("Failed to load credit cards")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCardName("")
    setLastFourDigits("")
    setBank("")
    setBillingCycle("1")
    setDueDate("15")
    setGracePeriod("3")
    setCardNetwork("")
    setCardLimit("")
    setIsActive(true)
    setCurrentCard(null)
    setIsEditing(false)
  }

  const handleOpenDialog = (card?: CreditCard) => {
    if (card) {
      setCardName(card.cardName)
      setLastFourDigits(card.lastFourDigits)
      setBank(card.bank)
      setBillingCycle(card.billingCycle.toString())
      setDueDate(card.dueDate.toString())
      setGracePeriod(card.gracePeriod.toString())
      setCardNetwork(card.cardNetwork || "")
      setCardLimit(card.cardLimit?.toString() || "")
      setIsActive(card.isActive)
      setCurrentCard(card)
      setIsEditing(true)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const body = {
        cardName,
        lastFourDigits,
        bank,
        billingCycle: parseInt(billingCycle),
        dueDate: parseInt(dueDate),
        gracePeriod: parseInt(gracePeriod),
        cardNetwork: cardNetwork || undefined,
        cardLimit: cardLimit ? parseFloat(cardLimit) : undefined,
        isActive,
      }

      const url = isEditing ? `/api/credit-cards/${currentCard?.id}` : "/api/credit-cards"
      const method = isEditing ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success(isEditing ? "Card updated successfully" : "Card added successfully")
        setIsDialogOpen(false)
        resetForm()
        loadCards()
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to save card")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return

    try {
      const response = await fetch(`/api/credit-cards/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Card deleted successfully")
        loadCards()
      } else {
        toast.error("Failed to delete card")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credit Cards</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your credit cards and billing cycles
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CardIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No credit cards</h3>
            <p className="text-muted-foreground mb-4">
              Add your first credit card to track expenses
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className={!card.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <CardIcon className="h-5 w-5" />
                    <CardTitle className="text-lg">{card.bank}</CardTitle>
                  </div>
                  {!card.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <CardDescription>{card.cardName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Card Number</span>
                    <span className="font-mono">•••• {card.lastFourDigits}</span>
                  </div>
                  {card.cardNetwork && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Network</span>
                      <span>{card.cardNetwork}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billing Cycle</span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {card.billingCycle}
                      {card.billingCycle === 1 || card.billingCycle === 21 || card.billingCycle === 31
                        ? "st"
                        : card.billingCycle === 2 || card.billingCycle === 22
                        ? "nd"
                        : card.billingCycle === 3 || card.billingCycle === 23
                        ? "rd"
                        : "th"}{" "}
                      of month
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Payment Due</span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {card.dueDate}
                      {card.dueDate === 1 || card.dueDate === 21 || card.dueDate === 31
                        ? "st"
                        : card.dueDate === 2 || card.dueDate === 22
                        ? "nd"
                        : card.dueDate === 3 || card.dueDate === 23
                        ? "rd"
                        : "th"}{" "}
                      of month
                    </span>
                  </div>
                  {card.cardLimit && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Limit</span>
                      <span>₹{card.cardLimit.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(card)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add"} Credit Card</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update" : "Enter"} your credit card details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name *</Label>
              <Input
                id="cardName"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g., HDFC Regalia, Axis Vistara"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank">Bank *</Label>
                <Input
                  id="bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="e.g., HDFC, Axis"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastFourDigits">Last 4 Digits *</Label>
                <Input
                  id="lastFourDigits"
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value)}
                  placeholder="1234"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Day *</Label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Cycle closes</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Day *</Label>
                <Select value={dueDate} onValueChange={setDueDate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Payment due</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Days *</Label>
                <Select value={gracePeriod} onValueChange={setGracePeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => i).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">After due</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardNetwork">Network</Label>
                <Select value={cardNetwork} onValueChange={setCardNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Amex">American Express</SelectItem>
                    <SelectItem value="RuPay">RuPay</SelectItem>
                    <SelectItem value="Diners">Diners Club</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardLimit">Card Limit (₹)</Label>
                <Input
                  id="cardLimit"
                  type="number"
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active card
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Update" : "Add"} Card</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}