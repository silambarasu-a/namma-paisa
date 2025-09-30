import { NextResponse } from "next/server"

// Using Yahoo Finance API for real-time stock search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const market = searchParams.get("market") || "IN"

    if (!query || query.length < 1) {
      return NextResponse.json([])
    }

    // Use Yahoo Finance query API
    const suffix = market === "US" ? "" : ".NS" // .NS for NSE India
    const searchQuery = market === "IN" ? `${query} india stock` : query

    const apiUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=15&newsCount=0`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const quotes = data?.quotes || []

    // Filter and transform results
    const results = quotes
      .filter((quote: any) => {
        if (market === "IN") {
          // For Indian market, only include NSE/BSE stocks
          return quote.symbol?.includes('.NS') || quote.symbol?.includes('.BO') ||
                 quote.exchange === 'NSI' || quote.exchange === 'BSE'
        } else {
          // For US market, include major exchanges
          return ['NASDAQ', 'NYSE', 'AMEX', 'NYQ', 'NMS'].includes(quote.exchange)
        }
      })
      .slice(0, 15)
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchDisp || quote.exchange,
        sector: quote.sector || quote.industry || 'N/A'
      }))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching stocks:", error)

    // Fallback to curated list if API fails
    const market = new URL(request.url).searchParams.get("market")
    const query = new URL(request.url).searchParams.get("q") || ""

    const indianStocks = [
      { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", exchange: "NSE", sector: "Energy" },
      { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", exchange: "NSE", sector: "IT Services" },
      { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", exchange: "NSE", sector: "Banking" },
      { symbol: "INFY.NS", name: "Infosys Ltd", exchange: "NSE", sector: "IT Services" },
      { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", exchange: "NSE", sector: "Banking" },
      { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", exchange: "NSE", sector: "FMCG" },
      { symbol: "ITC.NS", name: "ITC Ltd", exchange: "NSE", sector: "FMCG" },
      { symbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE", sector: "Banking" },
      { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", exchange: "NSE", sector: "Telecom" },
      { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", exchange: "NSE", sector: "Banking" },
    ]

    const usStocks = [
      { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", sector: "Technology" },
      { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology" },
      { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", sector: "Technology" },
      { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", sector: "E-Commerce" },
      { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", sector: "Automotive" },
      { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", sector: "Technology" },
      { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Technology" },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", sector: "Banking" },
      { symbol: "V", name: "Visa Inc.", exchange: "NYSE", sector: "Financial Services" },
      { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", sector: "Retail" },
    ]

    const stocks = market === "US" ? usStocks : indianStocks
    const results = stocks.filter(stock =>
      stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
      stock.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10)

    return NextResponse.json(results)
  }
}
