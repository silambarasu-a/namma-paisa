"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CreditCard as CardIcon,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CreditCard } from "@/types";
import { INDIAN_BANKS } from "@/constants/banks";

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCard, setCurrentCard] = useState<CreditCard | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  // Form state
  const [cardName, setCardName] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [bank, setBank] = useState("");
  const [bankInput, setBankInput] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [billingCycle, setBillingCycle] = useState("1");
  const [dueDate, setDueDate] = useState("15");
  const [gracePeriod, setGracePeriod] = useState("3");
  const [cardNetwork, setCardNetwork] = useState("");
  const [cardLimit, setCardLimit] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  // Filter banks based on input
  const filteredBanks = useMemo(() => {
    if (!bankInput) return INDIAN_BANKS.slice(0, 20);

    const searchLower = bankInput.toLowerCase();
    const filtered = INDIAN_BANKS.filter((bank) =>
      bank.toLowerCase().includes(searchLower),
    );

    if (filtered.length === 0 && bankInput.trim()) {
      return ["Other"];
    }

    return filtered;
  }, [bankInput]);

  const loadCards = async () => {
    try {
      const response = await fetch("/api/credit-cards");
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error("Error loading cards:", error);
      toast.error("Failed to load credit cards");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCardName("");
    setLastFourDigits("");
    setBank("");
    setBankInput("");
    setShowBankDropdown(false);
    setBillingCycle("1");
    setDueDate("15");
    setGracePeriod("3");
    setCardNetwork("");
    setCardLimit("");
    setIsActive(true);
    setCurrentCard(null);
    setIsEditing(false);
  };

  const handleOpenDialog = (card?: CreditCard) => {
    if (card) {
      setCardName(card.cardName);
      setLastFourDigits(card.lastFourDigits);
      setBank(card.bank);
      setBankInput(card.bank);
      setBillingCycle(card.billingCycle.toString());
      setDueDate(card.dueDate.toString());
      setGracePeriod(card.gracePeriod.toString());
      setCardNetwork(card.cardNetwork || "");
      setCardLimit(card.cardLimit?.toString() || "");
      setIsActive(card.isActive);
      setCurrentCard(card);
      setIsEditing(true);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleBankSelect = (selectedBank: string) => {
    if (selectedBank === "Other") {
      setBank(bankInput);
    } else {
      setBankInput(selectedBank);
      setBank(selectedBank);
    }
    setShowBankDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      };

      const url = isEditing
        ? `/api/credit-cards/${currentCard?.id}`
        : "/api/credit-cards";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          isEditing ? "Card updated successfully" : "Card added successfully",
        );
        setIsDialogOpen(false);
        resetForm();
        loadCards();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save card");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const openDeleteDialog = (id: string) => {
    setCardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;

    try {
      const response = await fetch(`/api/credit-cards/${cardToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Card deleted successfully");
        loadCards();
      } else {
        toast.error("Failed to delete card");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Credit Cards
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your credit cards and billing cycles
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : cards.length === 0 ? (
        <div className="relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="relative p-6 sm:p-12 text-center">
            <CardIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              No credit cards
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Add your first credit card to track expenses
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`relative overflow-hidden rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 ${!card.isActive ? "opacity-60" : ""}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
              <div className="relative p-4 sm:p-6 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <CardIcon className="h-5 w-5 flex-shrink-0" />
                    <h3 className="text-base sm:text-lg font-semibold truncate">
                      {card.bank}
                    </h3>
                  </div>
                  {!card.isActive && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {card.cardName}
                </p>
              </div>
              <div className="relative px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex-shrink-0">
                      Card Number
                    </span>
                    <span className="font-mono">
                      •••• {card.lastFourDigits}
                    </span>
                  </div>
                  {card.cardNetwork && (
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="text-muted-foreground flex-shrink-0">
                        Network
                      </span>
                      <span className="truncate">{card.cardNetwork}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex-shrink-0">
                      Billing Cycle
                    </span>
                    <span className="flex items-center flex-shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {card.billingCycle}
                      {card.billingCycle === 1 ||
                      card.billingCycle === 21 ||
                      card.billingCycle === 31
                        ? "st"
                        : card.billingCycle === 2 || card.billingCycle === 22
                          ? "nd"
                          : card.billingCycle === 3 || card.billingCycle === 23
                            ? "rd"
                            : "th"}{" "}
                      of month
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex-shrink-0">
                      Payment Due
                    </span>
                    <span className="flex items-center flex-shrink-0">
                      <Calendar className="h-3 w-3 mr-1" />
                      {card.dueDate}
                      {card.dueDate === 1 ||
                      card.dueDate === 21 ||
                      card.dueDate === 31
                        ? "st"
                        : card.dueDate === 2 || card.dueDate === 22
                          ? "nd"
                          : card.dueDate === 3 || card.dueDate === 23
                            ? "rd"
                            : "th"}{" "}
                      of month
                    </span>
                  </div>
                  {card.cardLimit != null && card.cardLimit > 0 && (
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="text-muted-foreground flex-shrink-0">
                        Limit
                      </span>
                      <span className="truncate">
                        ₹{card.cardLimit.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(card)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => openDeleteDialog(card.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="bank">Bank *</Label>
                <div className="relative">
                  <Input
                    id="bank"
                    placeholder="Type to search or enter bank name..."
                    value={bankInput}
                    onChange={(e) => {
                      setBankInput(e.target.value);
                      setBank(e.target.value);
                      setShowBankDropdown(true);
                    }}
                    onFocus={() => setShowBankDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowBankDropdown(false), 200);
                    }}
                    autoComplete="off"
                    required
                  />
                  {showBankDropdown && filteredBanks.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                      {filteredBanks.map((bankOption) => (
                        <div
                          key={bankOption}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm flex items-center gap-2"
                          onClick={() => handleBankSelect(bankOption)}
                        >
                          {bankOption === "Other" ? (
                            <>
                              <span className="text-muted-foreground">
                                Other:
                              </span>
                              <span className="font-medium">
                                &quot;{bankInput}&quot;
                              </span>
                            </>
                          ) : (
                            <>
                              {bankInput &&
                                bankOption
                                  .toLowerCase()
                                  .includes(bankInput.toLowerCase()) && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              {bankOption}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingCycle" className="text-xs sm:text-sm">
                  Billing Day *
                </Label>
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
                <Label htmlFor="dueDate" className="text-xs sm:text-sm">
                  Due Day *
                </Label>
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
                <Label htmlFor="gracePeriod" className="text-xs sm:text-sm">
                  Grace Days *
                </Label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                {isEditing ? "Update" : "Add"} Card
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 pointer-events-none rounded-lg"></div>
          <div className="relative">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this credit card? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
