import { NextResponse } from "next/server"

// Using MFApi.in for real-time mutual fund search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Fetch from MFApi - Free API for Indian Mutual Funds
    const apiUrl = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    console.log('MFApi response:', {
      query,
      isArray: Array.isArray(data),
      count: Array.isArray(data) ? data.length : 0,
      sample: Array.isArray(data) ? data[0] : data
    })

    // Transform the response to our format
    const results = (Array.isArray(data) ? data : []).slice(0, 15).map((fund: { schemeCode?: number; schemeName?: string }) => ({
      id: fund.schemeCode?.toString() || '',
      symbol: fund.schemeCode?.toString() || '',
      name: fund.schemeName || '',
      category: extractCategory(fund.schemeName || ''),
      amc: extractAMC(fund.schemeName || '')
    }))

    console.log('Transformed results:', results.length, 'funds')

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching funds:", error)

    // Fallback to sample data if API fails
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const fallbackFunds = [
      { id: "MF001", symbol: "120503", name: "ICICI Prudential Bluechip Fund - Direct Plan - Growth", category: "Large Cap", amc: "ICICI Prudential" },
      { id: "MF002", symbol: "120305", name: "Axis Bluechip Fund - Direct Plan - Growth", category: "Large Cap", amc: "Axis Mutual Fund" },
      { id: "MF003", symbol: "118989", name: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", category: "Mid Cap", amc: "HDFC Mutual Fund" },
      { id: "MF004", symbol: "122639", name: "SBI Small Cap Fund - Direct Plan - Growth", category: "Small Cap", amc: "SBI Mutual Fund" },
      { id: "MF005", symbol: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", category: "Flexi Cap", amc: "PPFAS Mutual Fund" },
    ].filter(fund =>
      fund.name.toLowerCase().includes(query.toLowerCase()) ||
      fund.category.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10)

    return NextResponse.json(fallbackFunds)
  }
}

function extractCategory(schemeName: string): string {
  const name = schemeName.toLowerCase()
  if (name.includes('small cap')) return 'Small Cap'
  if (name.includes('mid cap') || name.includes('midcap')) return 'Mid Cap'
  if (name.includes('large cap') || name.includes('bluechip') || name.includes('blue chip')) return 'Large Cap'
  if (name.includes('flexi cap') || name.includes('flexicap') || name.includes('multi cap')) return 'Flexi Cap'
  if (name.includes('index') || name.includes('nifty') || name.includes('sensex')) return 'Index Fund'
  if (name.includes('equity')) return 'Equity'
  if (name.includes('debt') || name.includes('bond')) return 'Debt'
  if (name.includes('hybrid') || name.includes('balanced')) return 'Hybrid'
  if (name.includes('elss') || name.includes('tax saver')) return 'ELSS'
  return 'Other'
}

function extractAMC(schemeName: string): string {
  const amcPatterns = [
    'ICICI Prudential', 'HDFC', 'Axis', 'SBI', 'Kotak', 'Aditya Birla Sun Life', 'ABSL',
    'Mirae Asset', 'Nippon India', 'UTI', 'DSP', 'Tata', 'Franklin Templeton',
    'Parag Parikh', 'PPFAS', 'Quant', 'Motilal Oswal', 'Edelweiss', 'Invesco'
  ]

  for (const amc of amcPatterns) {
    if (schemeName.includes(amc)) {
      return amc
    }
  }

  return schemeName.split(' ')[0] || 'Unknown'
}
