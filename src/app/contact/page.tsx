"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Logo } from "@/components/icons/logo"
import { Footer } from "@/components/layout/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { Mail, MapPin, Phone, ArrowLeft } from "lucide-react"

interface ContactInfo {
  email: string
  phone: string
  location: string
}

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: "",
    phone: "",
    location: "",
  })

  useEffect(() => {
    fetchContactInfo()
  }, [])

  const fetchContactInfo = async () => {
    try {
      const response = await fetch("/api/contact")
      if (response.ok) {
        const data = await response.json()
        setContactInfo(data)
      }
    } catch (error) {
      console.error("Failed to fetch contact info:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (message.length < 10) {
      toast.error("Message must be at least 10 characters")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Message sent successfully!", {
          description: "We'll get back to you as soon as possible.",
        })
        // Reset form
        setName("")
        setEmail("")
        setSubject("")
        setMessage("")
      } else {
        toast.error(data.message || "Failed to send message")
      }
    } catch {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="fixed top-4 left-4 right-4 z-30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-blue-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 backdrop-blur-3xl"></div>
        <nav className="relative container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10" />
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Namma Paisa
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">Personal Finance Manager</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/">
              <Button variant="ghost" size="sm" className="sm:size-default">
                <ArrowLeft className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Contact Content */}
      <section className="container mx-auto px-4 sm:px-6 pb-8 sm:pb-12 md:pb-20 pt-28 sm:pt-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Get in Touch</h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 px-4">
              Have questions? We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Contact Form */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send us a message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we&apos;ll get back to you shortly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="What is this regarding?"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more about your inquiry..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={6}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        {message.length}/10 characters minimum
                      </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                      {isLoading ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 sm:space-y-6">
              {(contactInfo.email || contactInfo.phone || contactInfo.location) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {contactInfo.email && (
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium">Email</p>
                          <a
                            href={`mailto:${contactInfo.email}`}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors break-all"
                          >
                            {contactInfo.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {contactInfo.phone && (
                      <div className="flex items-start space-x-3">
                        <Phone className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Phone</p>
                          <a
                            href={`tel:${contactInfo.phone}`}
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                          >
                            {contactInfo.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {contactInfo.location && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {contactInfo.location}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-4 sm:pt-6">
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Quick Response</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    We typically respond within 24 hours during business days.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 sm:mt-12">
        <Footer />
      </div>
    </div>
  )
}
