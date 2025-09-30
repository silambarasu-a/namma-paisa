import { NextResponse } from "next/server"

// Using CoinGecko API for real-time crypto search (Free, no API key needed)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    if (!query || query.length < 1) {
      return NextResponse.json([])
    }

    // CoinGecko search API (free, no auth required)
    const apiUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 600 } // Cache for 10 minutes
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const coins = data?.coins || []

    // Transform the response
    const results = coins.slice(0, 20).map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      category: determineCategory(coin),
      marketCapRank: coin.market_cap_rank || null
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error searching crypto:", error)

    // Fallback to popular cryptos if API fails
    const query = new URL(request.url).searchParams.get("q")?.toLowerCase() || ""

    const fallbackCryptos = [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", category: "Layer 1" },
      { id: "ethereum", symbol: "ETH", name: "Ethereum", category: "Layer 1" },
      { id: "binancecoin", symbol: "BNB", name: "BNB", category: "Exchange" },
      { id: "ripple", symbol: "XRP", name: "XRP", category: "Payment" },
      { id: "cardano", symbol: "ADA", name: "Cardano", category: "Layer 1" },
      { id: "solana", symbol: "SOL", name: "Solana", category: "Layer 1" },
      { id: "polkadot", symbol: "DOT", name: "Polkadot", category: "Layer 0" },
      { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", category: "Meme" },
      { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", category: "Layer 1" },
      { id: "matic-network", symbol: "MATIC", name: "Polygon", category: "Layer 2" },
      { id: "chainlink", symbol: "LINK", name: "Chainlink", category: "Oracle" },
      { id: "litecoin", symbol: "LTC", name: "Litecoin", category: "Payment" },
      { id: "uniswap", symbol: "UNI", name: "Uniswap", category: "DeFi" },
      { id: "cosmos", symbol: "ATOM", name: "Cosmos", category: "Layer 0" },
      { id: "stellar", symbol: "XLM", name: "Stellar", category: "Payment" },
      { id: "tron", symbol: "TRX", name: "TRON", category: "Layer 1" },
      { id: "algorand", symbol: "ALGO", name: "Algorand", category: "Layer 1" },
      { id: "vechain", symbol: "VET", name: "VeChain", category: "Supply Chain" },
      { id: "filecoin", symbol: "FIL", name: "Filecoin", category: "Storage" },
      { id: "aave", symbol: "AAVE", name: "Aave", category: "DeFi" },
    ]

    const results = fallbackCryptos.filter(crypto =>
      crypto.symbol.toLowerCase().includes(query) ||
      crypto.name.toLowerCase().includes(query) ||
      crypto.category.toLowerCase().includes(query)
    ).slice(0, 10)

    return NextResponse.json(results)
  }
}

function determineCategory(coin: any): string {
  const name = coin.name?.toLowerCase() || ''
  const symbol = coin.symbol?.toLowerCase() || ''

  // Categorize based on common patterns
  if (name.includes('bitcoin') || symbol === 'btc') return 'Layer 1'
  if (name.includes('ethereum') || symbol === 'eth') return 'Layer 1'
  if (name.includes('binance') || symbol === 'bnb') return 'Exchange'
  if (['usdt', 'usdc', 'dai', 'busd'].includes(symbol)) return 'Stablecoin'
  if (name.includes('defi') || name.includes('swap') || name.includes('dex')) return 'DeFi'
  if (name.includes('nft') || name.includes('art') || name.includes('collectible')) return 'NFT'
  if (name.includes('game') || name.includes('play')) return 'Gaming'
  if (name.includes('dog') || name.includes('shib') || name.includes('meme')) return 'Meme'
  if (name.includes('meta') || name.includes('verse')) return 'Metaverse'
  if (name.includes('storage') || name.includes('file')) return 'Storage'
  if (name.includes('oracle') || name.includes('link')) return 'Oracle'
  if (name.includes('layer 2') || name.includes('polygon') || name.includes('arbitrum')) return 'Layer 2'
  if (coin.market_cap_rank && coin.market_cap_rank <= 50) return 'Top 50'

  return 'Cryptocurrency'
}
