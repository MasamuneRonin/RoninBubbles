"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, X, Info } from "lucide-react"
import CryptoDetails from "@/components/crypto-details"
import { Skeleton } from "@/components/ui/skeleton"
import CryptoBubblePhysics from "@/components/crypto-bubble-physics"
import TokenImageService from "@/lib/image-service";
import BubbleHeader from "@/components/bubble-header"
import TradeBubbles from "@/components/trade-bubbles"

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
  const [showUpOnly, setShowUpOnly] = useState(false)
  const [showDownOnly, setShowDownOnly] = useState(false)
  const [tokenLimit, setTokenLimit] = useState<10 | 25 | 50 | 100>(50) // Changed default to 50
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Add this for the view switching
  const [activeView, setActiveView] = useState<"tokens" | "nfts">("tokens")
  
  // Add this handler for view changes
// Update the handleViewChange function to handle all possible view types
  const handleViewChange = (value: "tokens" | "nfts" | "trades" | "transactions") => {
    // Only act on tokens/nfts toggles - ignore trades/transactions
    if (value === "tokens" || value === "nfts") {
      setActiveView(value);
      if (value === "nfts") {
        window.location.href = "/?view=nfts";
      }
    }
  }


  // Add this state to the CryptoBubbles component
  const [viewMode, setViewMode] = useState<"details" | "trades">("details")

  // Update the handleBubbleClick function
  const handleBubbleClick = (crypto: CryptoData) => {
    setSelectedCrypto(crypto)
    setViewMode("details") // Default to details view when clicking a bubble
  }

  // Add this function to switch to trades view
  const showTradesView = () => {
    setViewMode("trades")
  }

  // Add this function to switch back to details view
  const showDetailsView = () => {
    setViewMode("details")
  }
  // Create a separate fetchData function with improved refresh behavior
  const fetchData = async () => {
    try {
      // Don't set loading to true on refresh - keep current data visible
      if (cryptoData.length === 0) {
        setLoading(true)
      }

      // Create an array of promises for fetching all pages
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

      // console.log(`Fetched ${allPoolsData.length} pools from ${pagesData.length} pages`)

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

        const txH6 = {
          buys: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h6?.buys || 0), 0),
          sells: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h6?.sells || 0), 0),
          buyers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h6?.buyers || 0), 0),
          sellers: pools.reduce((sum, pool) => sum + (pool.attributes.transactions?.h6?.sellers || 0), 0)
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

        // Get existing token data if available to preserve its image
        const existingToken = cryptoData.find(t => t.symbol === symbol);

        // Initially use the fallback image OR existing image if available
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
          transactions_h6: txH6,
          transactions_h24: txH24,
          reserve_in_usd: totalReserve,
          image: existingToken?.image || '/token_logo.png', // Preserve image if token exists
          baseTokenId: baseTokenId,
          pair_name: poolCount > 1 ? `${symbol} (${poolCount} pools)` : pools[0].attributes.name,
          pool_count: poolCount
        };
      });

      setCryptoData(prevData => {
        // Create a map of new data by symbol for efficient lookup
        const newTokensMap = transformedData.reduce((map, token) => {
          map[token.symbol] = token;
          return map;
        }, {} as Record<string, any>);
        
        // First, update existing tokens while preserving their position in the array
        const updatedExistingTokens = prevData.map(existingToken => {
          const newToken = newTokensMap[existingToken.symbol];
          
          // If this token doesn't exist in new data, keep it unchanged
          if (!newToken) return existingToken;
          
          // Preserve the existing token's position by updating only its data properties
          // We keep the same object reference to help physics engine maintain position
          return {
            ...existingToken,                         // Keep original properties (esp. position-related data)
            current_price: newToken.current_price,    // Update price
            price_change_percentage_m5: newToken.price_change_percentage_m5,
            price_change_percentage_h1: newToken.price_change_percentage_h1,
            price_change_percentage_h6: newToken.price_change_percentage_h6,
            price_change_percentage_h24: newToken.price_change_percentage_h24,
            market_cap: newToken.market_cap,
            fdv_usd: newToken.fdv_usd,
            volume_m5: newToken.volume_m5,
            volume_h1: newToken.volume_h1,
            volume_h6: newToken.volume_h6,
            volume_h24: newToken.volume_h24,
            total_volume: newToken.total_volume,
            transactions_m5: newToken.transactions_m5,
            transactions_h1: newToken.transactions_h1,
            transactions_h6: newToken.transactions_h6,
            transactions_h24: newToken.transactions_h24,
            reserve_in_usd: newToken.reserve_in_usd,
            pair_name: newToken.pair_name,
            pool_count: newToken.pool_count,
            // Keep existing image unless it's the default
            image: (existingToken.image !== '/token_logo.png')
              ? existingToken.image
              : newToken.image
          };
        });
        
        // Find any new tokens that don't exist in the current data
        const existingSymbols = new Set(prevData.map(token => token.symbol));
        const brandNewTokens = transformedData.filter(token => !existingSymbols.has(token.symbol));
        
        // Create the final updated state with existing and new tokens
        const updatedData = [...updatedExistingTokens, ...brandNewTokens];
        
        // Schedule image loading after the state update is processed
        setTimeout(() => {
          // Try to load custom images for ALL tokens in the updated data
          updatedData.forEach(token => {
            // Skip tokens that already have custom images
            if (token.image !== '/token_logo.png') return;
            
            // Get the baseTokenId from the corresponding transformedData item if available
            const sourceToken = newTokensMap[token.symbol] || 
                                transformedData.find(t => t.symbol === token.symbol);
            
            if (sourceToken?.baseTokenId) {
              const tokenAddress = sourceToken.baseTokenId.split('_')[1];
              
              tokenImageService.getTokenImageUrl(tokenAddress, (imageUrl) => {
                setCryptoData(currentData => {
                  const tokenIndex = currentData.findIndex((t: CryptoData) => t.id === token.id);
                  // Only update if we found the token and the image would change
                  if (tokenIndex >= 0 && currentData[tokenIndex].image !== imageUrl) {
                    const newData = [...currentData];
                    newData[tokenIndex] = {...newData[tokenIndex], image: imageUrl};
                    return newData;
                  }
                  return currentData;
                });
              });
            }
          });
        }, 0);
        
        return updatedData;
      });

    } catch (error) {
      console.error("Error fetching crypto data:", error)
      // For demo, use mock data if API fails and no data exists
      if (cryptoData.length === 0) {
        const mockData = generateMockData()
        setCryptoData(mockData)
      }
    } finally {
      setLoading(false)
    }
    
    // Return a promise that resolves when done
    return Promise.resolve();
  };

  // Fetch crypto data only on initial mount
  useEffect(() => {
    fetchData();
  }, []);
  
  // Setup refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time to refresh data
          setRefreshing(true);
          fetchData().finally(() => {
            setRefreshing(false);
            return 30; // Reset timer
          });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  // Apply filters without triggering data refresh
  useEffect(() => {
    if (cryptoData.length === 0) return;
    
    // Filter by price direction (up only/down only)
    let filtered = [...cryptoData];
    
    // Apply direction filters
    if (showUpOnly) {
      filtered = filtered.filter(crypto => getPriceChangeForTimeframe(crypto) > 0);
    } else if (showDownOnly) {
      filtered = filtered.filter(crypto => getPriceChangeForTimeframe(crypto) < 0);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (crypto) =>
          crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          crypto.pair_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply token limit - first sort by volume
    filtered.sort((a, b) => getVolumeForTimeframe(b) - getVolumeForTimeframe(a));
    // Then limit the number of tokens
    filtered = filtered.slice(0, tokenLimit);
    
    setFilteredData(filtered);
    
    // This effect depends on filter states but NOT on cryptoData to avoid refresh
  }, [timeframe, showUpOnly, showDownOnly, tokenLimit, searchQuery, cryptoData]);

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

  // Format timeframe for display
  const formatTimeframe = (timeframe: string): string => {
    switch(timeframe) {
      case "m5": return "5m";
      case "h1": return "1h";
      case "h6": return "6h";
      case "h24": return "24h";
      default: return "24h";
    }
  }

  // Share to Twitter function
  const shareToTwitter = (crypto: CryptoData) => {
    const priceChange = getPriceChangeForTimeframe(crypto);
    const formattedChange = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;
    const timeframeDisplay = formatTimeframe(timeframe);
    
    // Select emoji based on price direction
    const emoji = priceChange >= 0 ? '🚀' : '📉';
    
    // Create the tweet text with conditionally selected emoji
    const tweetText = `$${crypto.symbol} is ${priceChange >= 0 ? 'up' : 'down'} ${formattedChange} in the last ${timeframeDisplay} on @Ronin_Network! ${emoji}\n`;
    
     // URL to share (link to the token's trade page)
  const tokenIdentifier = crypto.id;
  const shareUrl = `${window.location.origin}/token/${tokenIdentifier}`;
    
    // Construct the Twitter intent URL without hashtags
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    
    // Open Twitter intent in a new window
    window.open(twitterUrl, '_blank');
  };

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
  return (
    <div className="w-full pt-0 -mt-2">
      <Card className="w-full bg-[#0f2447] border-blue-800 text-blue-100">
        <BubbleHeader
          title="Token"
          activeView={activeView}
          onViewChange={handleViewChange}
          timeframe={timeframe}
          onTimeframeChange={(value) => setTimeframe(value)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showUpOnly={showUpOnly}
          onShowUpOnlyChange={setShowUpOnly}
          showDownOnly={showDownOnly}
          onShowDownOnlyChange={setShowDownOnly}
          tokenLimit={tokenLimit}
          onTokenLimitChange={setTokenLimit}
          timeRemaining={timeRemaining}
          searchPlaceholder="Search tokens..."
          description="Ronin Tokens Performance"
        />
        <CardContent className="pt-1"> {/* Reduced top padding */}
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
          {selectedCrypto && (
            <CryptoDetails 
              crypto={selectedCrypto} 
              timeframe={timeframe} 
              onClose={closeDetails} 
              shareToTwitter={shareToTwitter}
              onViewTrades={() => {
                // Close the current modal
                closeDetails();
                
                // Navigate to the trades page for this token
                const tokenIdentifier = selectedCrypto.id;
                window.location.href = `/token/${tokenIdentifier}`;
              }}
            />
          )}
        </AnimatePresence>
    </div>
  )
}
