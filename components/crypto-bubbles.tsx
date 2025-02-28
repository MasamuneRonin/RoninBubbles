"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import CryptoDetails from "@/components/crypto-details"
import { Skeleton } from "@/components/ui/skeleton"
import CryptoBubblePhysics from "@/components/crypto-bubble-physics"
import TokenImageService from "@/lib/image-service";

// Types for our crypto data
export interface CryptoData {
  id: string
  name: string
  symbol: string
  current_price: number
  price_change_percentage_m5: number
  price_change_percentage_h1: number
  price_change_percentage_h6: number
  price_change_percentage_h24: number
  market_cap: number
  volume_m5: number
  volume_h1: number
  volume_h6: number
  volume_h24: number
  total_volume: number
  transactions_m5: {
    buys: number
    sells: number
    buyers: number
    sellers: number
  }
  transactions_h1: {
    buys: number
    sells: number
    buyers: number
    sellers: number
  }
  transactions_h6?: {
    buys: number
    sells: number
    buyers: number
    sellers: number
  }
  transactions_h24: {
    buys: number
    sells: number
    buyers: number
    sellers: number
  }
  reserve_in_usd: number
  image: string
  pair_name: string
  pool_count?: number
  fdv_usd?: number
}

// GeckoTerminal API types
interface GeckoPoolData {
  id: string
  type: string
  attributes: {
    base_token_price_usd: string
    quote_token_price_usd: string
    address: string
    name: string
    pool_created_at: string
    fdv_usd: string
    market_cap_usd: string | null
    price_change_percentage: {
      m5: string
      h1: string
      h6: string
      h24: string
    }
    volume_usd: {
      m5: string
      h1: string
      h6: string
      h24: string
    }
    reserve_in_usd: string
    transactions?: {
      m5?: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
      h1?: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
      h6?: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
      h24?: {
        buys: number
        sells: number
        buyers: number
        sellers: number
      }
    }
  }
  relationships: {
    base_token: {
      data: {
        id: string
        type: string
      }
    }
    quote_token: {
      data: {
        id: string
        type: string
      }
    }
  }
}


// Create an instance with the direct path
const tokenImageService = new TokenImageService('/token_logo.png');

export default function CryptoBubbles() {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [filteredData, setFilteredData] = useState<CryptoData[]>([])
  const [timeframe, setTimeframe] = useState<"m5" | "h1" | "h6" | "h24">("h24")
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  // Fetch crypto data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Create an array of promises for fetching all 10 pages
        const pagePromises = []
        for (let page = 1; page <= 5; page++) {
          pagePromises.push(
            fetch(`https://api.geckoterminal.com/api/v2/networks/ronin/pools?page=${page}`)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch page ${page}`)
                return response.json()
              })
              .catch(error => {
                console.warn(`Error fetching page ${page}:`, error)
                return { data: [] } // Return empty data for failed pages
              })
          )
        }

        // Wait for all page requests to complete
        const pagesData = await Promise.all(pagePromises)

        // Combine all pool data from all pages
        const allPoolsData: GeckoPoolData[] = []
        pagesData.forEach((pageResponse: { data?: GeckoPoolData[] }) => {
          if (pageResponse.data && Array.isArray(pageResponse.data)) {
            allPoolsData.push(...pageResponse.data)
          }
        })

        console.log(`Fetched ${allPoolsData.length} pools from ${pagesData.length} pages`)

        // Group pools by base token symbol
        const tokenMap = new Map<string, GeckoPoolData[]>()

        allPoolsData.forEach(pool => {
          // Extract base token symbol from pool name
          const nameParts = pool.attributes.name.split(' / ')
          const baseSymbol = nameParts[0]
  
          if (!tokenMap.has(baseSymbol)) {
            tokenMap.set(baseSymbol, [])
          }
  
          tokenMap.get(baseSymbol)!.push(pool)
        })

        // Calculate average metrics for each unique token
        const transformedData = Array.from(tokenMap.entries()).map(([symbol, pools]) => {
          const poolCount = pools.length;
  
          // Calculate average values across all pools
          const avgPrice = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.base_token_price_usd || '0'), 0) / poolCount
    
          const avgChangeM5 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.price_change_percentage.m5 || '0'), 0) / poolCount
    
          const avgChangeH1 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.price_change_percentage.h1 || '0'), 0) / poolCount
    
          const avgChangeH6 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.price_change_percentage.h6 || '0'), 0) / poolCount
    
          const avgChangeH24 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.price_change_percentage.h24 || '0'), 0) / poolCount
    
          // Get market cap - use the highest volume pool or calculate average
          let totalMarketCap = 0;

          if (pools.length === 1) {
            // If only one pool, just use its market cap
            totalMarketCap = pools[0].attributes.market_cap_usd 
              ? parseFloat(pools[0].attributes.market_cap_usd) 
              : parseFloat(pools[0].attributes.fdv_usd || '0');
          } else {
            // Find the pool with the highest 24h volume
            const highestVolumePool = pools.reduce((prev, current) => {
              const prevVolume = parseFloat(prev.attributes.volume_usd.h24 || '0');
              const currentVolume = parseFloat(current.attributes.volume_usd.h24 || '0');
              return currentVolume > prevVolume ? current : prev;
            }, pools[0]);
    
            // Use market cap from highest volume pool
            totalMarketCap = highestVolumePool.attributes.market_cap_usd 
              ? parseFloat(highestVolumePool.attributes.market_cap_usd) 
              : parseFloat(highestVolumePool.attributes.fdv_usd || '0');
          }
  
          // Get the total FDV (fully diluted valuation) if available
          const totalFdvUsd = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.fdv_usd || '0'), 0)
  
          // Sum volumes for each timeframe
          const totalVolumeM5 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.volume_usd.m5 || '0'), 0)
    
          const totalVolumeH1 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.volume_usd.h1 || '0'), 0)
    
          const totalVolumeH6 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.volume_usd.h6 || '0'), 0)
    
          const totalVolumeH24 = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.volume_usd.h24 || '0'), 0)
  
          // Sum transactions for each timeframe
          const txM5 = {
            buys: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.m5?.buys || 0), 0),
            sells: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.m5?.sells || 0), 0),
            buyers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.m5?.buyers || 0), 0),
            sellers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.m5?.sellers || 0), 0)
          }
  
          const txH1 = {
            buys: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h1?.buys || 0), 0),
            sells: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h1?.sells || 0), 0),
            buyers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h1?.buyers || 0), 0),
            sellers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h1?.sellers || 0), 0)
          }
  
          const txH24 = {
            buys: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h24?.buys || 0), 0),
            sells: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h24?.sells || 0), 0),
            buyers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h24?.buyers || 0), 0),
            sellers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h24?.sellers || 0), 0)
          }
  
          // Calculate total reserve across all pools
          const totalReserve = pools.reduce((sum, pool) => 
            sum + parseFloat(pool.attributes.reserve_in_usd || '0'), 0)
  
          // Use the first pool's base token ID
          const baseId = pools[0].id;
          const baseTokenId = pools[0].relationships.base_token.data.id;

          const cleanTokenId = baseTokenId.startsWith('ronin_') ? baseTokenId.substring(6) : baseTokenId;
  
          // Initially use the fallback image for all tokens
          return {
            id: cleanTokenId,
            name: symbol,
            symbol: symbol,
            current_price: avgPrice,
            price_change_percentage_m5: avgChangeM5,
            price_change_percentage_h1: avgChangeH1,
            price_change_percentage_h6: avgChangeH6,
            price_change_percentage_h24: avgChangeH24,
            market_cap: totalMarketCap,
            fdv_usd: totalFdvUsd,
            volume_m5: totalVolumeM5,
            volume_h1: totalVolumeH1,
            volume_h6: totalVolumeH6,
            volume_h24: totalVolumeH24,
            total_volume: totalVolumeH24,
            transactions_m5: txM5,
            transactions_h1: txH1,
            transactions_h24: txH24,
            reserve_in_usd: totalReserve,
            image: '/token_logo.png',
            baseTokenId: baseTokenId,
            pair_name: poolCount > 1 ? `${symbol} (${poolCount} pools)` : pools[0].attributes.name,
            pool_count: poolCount
          };
        });

        // Set initial state with fallback images
        setCryptoData(transformedData);
        setFilteredData(transformedData);

        // In your useEffect where you load images:
        transformedData.forEach(token => {
          if (token.baseTokenId) {
            const tokenAddress = token.baseTokenId.split('_')[1];
            
            // Queue image loading with callback to update state when image is ready
            tokenImageService.getTokenImageUrl(tokenAddress, (imageUrl) => {
              if (imageUrl !== '/token_logo.png') { // Only update if we got a real image
                setCryptoData(prevData => {
                  // Check if the image has actually changed to prevent unnecessary re-renders
                  const tokenIndex = prevData.findIndex((t: CryptoData) => t.id === token.id);
                  if (tokenIndex >= 0 && prevData[tokenIndex].image !== imageUrl) {
                    const newData = [...prevData];
                    newData[tokenIndex] = {...newData[tokenIndex], image: imageUrl};
                    return newData;
                  }
                  return prevData;
                });
              }
            });
          }
        });

      } catch (error) {
        console.error("Error fetching crypto data:", error)
        // For demo, use mock data if API fails
        const mockData = generateMockData()
        setCryptoData(mockData)
        setFilteredData(mockData)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])
  // Filter data based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredData(cryptoData)
    } else {
      const filtered = cryptoData.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.pair_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredData(filtered)
    }
  }, [searchQuery, cryptoData])

  // Handle bubble click
  const handleBubbleClick = (crypto: CryptoData) => {
    setSelectedCrypto(crypto)
  }

  // Close details modal
  const closeDetails = () => {
    setSelectedCrypto(null)
  }

  // Generate mock data for demo purposes
  const generateMockData = (): CryptoData[] => {
    const symbols = ["RON", "AXS", "SLP", "ETH", "USDC", "WETH", "USDT", "DAI", "MATIC", "BNB"]
    const names = [
      "Ronin",
      "Axie Infinity",
      "Smooth Love Potion",
      "Ethereum",
      "USD Coin",
      "Wrapped Ethereum",
      "Tether",
      "Dai",
      "Polygon",
      "Binance Coin",
    ]

    return Array.from({ length: 10 }, (_, i) => {
      const price = Math.random() * 1000 + 1
      const change_m5 = Math.random() * 5 - 2.5
      const change_h1 = Math.random() * 10 - 5
      const change_h6 = Math.random() * 15 - 7.5
      const change_h24 = Math.random() * 20 - 10
    
      const volume_h24 = price * 100000 * (Math.random() * 5 + 1)
      const volume_h6 = volume_h24 * 0.5 * Math.random()
      const volume_h1 = volume_h6 * 0.3 * Math.random()
      const volume_m5 = volume_h1 * 0.1 * Math.random()

      return {
        id: `crypto-${i}`,
        symbol: symbols[i],
        name: names[i],
        current_price: price,
        price_change_percentage_m5: change_m5,
        price_change_percentage_h1: change_h1,
        price_change_percentage_h6: change_h6,
        price_change_percentage_h24: change_h24,
        market_cap: price * 1000000 * (Math.random() * 10 + 1),
        fdv_usd: price * 1500000 * (Math.random() * 10 + 1),
        volume_m5: volume_m5,
        volume_h1: volume_h1,
        volume_h6: volume_h6,
        volume_h24: volume_h24,
        total_volume: volume_h24,
        transactions_m5: {
          buys: Math.floor(Math.random() * 5),
          sells: Math.floor(Math.random() * 5),
          buyers: Math.floor(Math.random() * 3),
          sellers: Math.floor(Math.random() * 3)
        },
        transactions_h1: {
          buys: Math.floor(Math.random() * 20),
          sells: Math.floor(Math.random() * 20),
          buyers: Math.floor(Math.random() * 10),
          sellers: Math.floor(Math.random() * 10)
        },
        transactions_h24: {
          buys: Math.floor(Math.random() * 200),
          sells: Math.floor(Math.random() * 200),
          buyers: Math.floor(Math.random() * 100),
          sellers: Math.floor(Math.random() * 100)
        },
        reserve_in_usd: price * 50000 * (Math.random() * 3 + 1),
        image: `/placeholder.svg?height=32&width=32`,
        pair_name: `${symbols[i]} / USDC`,
        pool_count: 1
      }
    })
  }
  // Helper function to get price change percentage based on timeframe
  const getPriceChangeForTimeframe = (crypto: CryptoData) => {
    switch(timeframe) {
      case "m5": return crypto.price_change_percentage_m5;
      case "h1": return crypto.price_change_percentage_h1;
      case "h6": return crypto.price_change_percentage_h6;
      case "h24": return crypto.price_change_percentage_h24;
      default: return crypto.price_change_percentage_h24;
    }
  }

  // Helper function to get volume based on timeframe
  const getVolumeForTimeframe = (crypto: CryptoData) => {
    switch(timeframe) {
      case "m5": return crypto.volume_m5;
      case "h1": return crypto.volume_h1;
      case "h6": return crypto.volume_h6;
      case "h24": return crypto.volume_h24;
      default: return crypto.volume_h24;
    }
  }

  // Helper function to get transactions data based on timeframe
  const getTransactionsForTimeframe = (crypto: CryptoData) => {
    switch(timeframe) {
      case "m5": return crypto.transactions_m5;
      case "h1": return crypto.transactions_h1;
      case "h6": return crypto.transactions_h6;
      case "h24": return crypto.transactions_h24;
      default: return crypto.transactions_h24;
    }
  }

  // Add this formatter function before the return statement
  const formatTimeframe = (timeframe: string): string => {
    switch(timeframe) {
      case "m5": return "5m";
      case "h1": return "1h";
      case "h6": return "6h";
      case "h24": return "24h";
      default: return "24h";
    }
  }

  // Add this function before the return statement
  const shareToTwitter = (crypto: CryptoData) => {
    const priceChange = getPriceChangeForTimeframe(crypto);
    const formattedChange = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
    const timeframeDisplay = formatTimeframe(timeframe);
    
    // Select emoji based on price direction
    const emoji = priceChange >= 0 ? '🚀' : '📉';
    
    // Create the tweet text with conditionally selected emoji
    const tweetText = `$${crypto.symbol} is ${priceChange >= 0 ? 'up' : 'down'} ${formattedChange} in the last ${timeframeDisplay} on @Ronin_Network! ${emoji}\n\nCheck out Ronin Bubbles by @Masamune_CTO to track token performance in real-time 🔥\n\n`.trim();
    
    // URL to share (your website)
    const shareUrl = window.location.href;
    
    // Construct the Twitter intent URL without hashtags
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    
    // Open Twitter intent in a new window
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="w-full pt-0 -mt-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <Tabs
          defaultValue="h24"
          className="w-full md:w-auto"
          onValueChange={(value) => setTimeframe(value as "m5" | "h1" | "h6" | "h24")}
        >
          <TabsList className="bg-blue-900/50">
            <TabsTrigger value="m5" className="data-[state=active]:bg-blue-700 text-blue-100">
              5m
            </TabsTrigger>
            <TabsTrigger value="h1" className="data-[state=active]:bg-blue-700 text-blue-100">
              1h
            </TabsTrigger>
            <TabsTrigger value="h6" className="data-[state=active]:bg-blue-700 text-blue-100">
              6h
            </TabsTrigger>
            <TabsTrigger value="h24" className="data-[state=active]:bg-blue-700 text-blue-100">
              24h
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="hidden md:flex items-center justify-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-blue-100">
            Ronin Bubbles by {" "}
            <a 
              href="https://x.com/masamune_CTO" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 transition-colors"
            >
              Masamune.meme
            </a>
          </h1>
          <img 
            src="/masa_sword.png" 
            alt="Masamune Bubbles Logo" 
            className="w-12 h-12" 
          />
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-300" />
          <Input
            placeholder="Search tokens..."
            className="pl-8 pr-8 bg-blue-900/30 border-blue-700 text-blue-100 placeholder:text-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="absolute right-2 top-2.5" onClick={() => setSearchQuery("")}>
              <X className="h-4 w-4 text-blue-300" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4 md:hidden">
        <h1 className="text-xl font-bold text-blue-100">
          Ronin Bubbles by {" "}
            <a 
              href="https://x.com/masamune_CTO" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 transition-colors"
            >
              Masamune.meme
            </a>
        </h1>
        <img 
          src="/masa_sword.png" 
          alt="Masamune Bubbles Logo" 
          className="w-10 h-10" 
        />
      </div>

      <Card className="w-full bg-[#0f2447] border-blue-800 text-blue-100">
        <CardHeader>
        <CardTitle>Ronin Tokens Performance ({formatTimeframe(timeframe)})</CardTitle>
          <CardDescription className="text-blue-300">
            Bubble size represents the magnitude of price change. Click empty space to repel bubbles. Click on a bubble
            for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="w-full h-[80vh] relative bg-[#061325] rounded-md">
            {loading ? (
              <div className="flex flex-wrap justify-center gap-4 h-full items-center">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-full bg-blue-900/30" />
                ))}
              </div>
            ) : (
              <CryptoBubblePhysics 
                cryptoData={filteredData} 
                timeframe={timeframe} 
                onBubbleClick={handleBubbleClick} 
                getPriceChangeForTimeframe={getPriceChangeForTimeframe}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedCrypto && <CryptoDetails crypto={selectedCrypto} timeframe={timeframe} onClose={closeDetails} shareToTwitter={shareToTwitter} />}
      </AnimatePresence>
    </div>
  )
}
