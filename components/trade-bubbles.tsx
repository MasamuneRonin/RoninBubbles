"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import TradeBubblePhysics from "@/components/trade-bubble-physics"
import BubbleHeader from "@/components/bubble-header"
import { Skeleton } from "@/components/ui/skeleton"
import TokenImageService from "@/lib/image-service";
import CryptoDetails from "@/components/crypto-details"

const tokenImageService = new TokenImageService('/token_logo.png');
  interface Trade {
    id: string
    type: "buy" | "sell"
    amount_usd: number
    amount_token: number
    timestamp: string
    tx_hash: string
    wallet_address?: string
  }

  // Updated GeckoTerminal API interfaces based on the actual response format
  interface GeckoTradeResponse {
    data: GeckoTrade[]
  }

  interface GeckoTrade {
    id: string
    type: string
    attributes: {
      block_number: number
      tx_hash: string
      tx_from_address: string
      from_token_amount: string
      to_token_amount: string
      price_from_in_currency_token: string
      price_to_in_currency_token: string
      price_from_in_usd: string
      price_to_in_usd: string
      block_timestamp: string
      kind: "buy" | "sell"
      volume_in_usd: string
      from_token_address: string
      to_token_address: string
    }
  }

  interface GeckoPoolResponse {
    data: {
      id: string
      type: string
      attributes: {
        name: string
        base_token_price_usd: string
        address: string
        // other attributes...
      }
      relationships: {
        base_token: {
          data: {
            id: string
          }
        }
        quote_token: {
          data: {
            id: string
          }
        }
      }
    }
    included: Array<{
      id: string
      type: string
      attributes: {
        name: string
        symbol: string
        address: string
        image_url: string | null
      }
    }>
  }

  // Add this interface at the top of your file with other interfaces
  interface TokenInfo {
    id: string
    name: string
    symbol: string
    current_price?: number
    image: string
    address: string
    price_change_percentage_24h?: string | null
  }

  export default function TokenTradesPage() {
    const params = useParams()
    const router = useRouter()
    const [token, setToken] = useState<TokenInfo | null>(null)
    const [poolAddress, setPoolAddress] = useState<string | null>(null)
    const [trades, setTrades] = useState<Trade[]>([])
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<"m5" | "h1" | "h6" | "h24">("h24")
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
    const [timeRemaining, setTimeRemaining] = useState(30)
    const [refreshing, setRefreshing] = useState(false)
    const [activeView, setActiveView] = useState<"trades" | "transactions">("trades")
    const [tradeLimit, setTradeLimit] = useState<10 | 25 | 50 | 100>(50)
    const [showUpOnly, setShowUpOnly] = useState(false)
    const [showDownOnly, setShowDownOnly] = useState(false)
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
    const [tokenDetails, setTokenDetails] = useState<any>(null);
    const [tokenInfo, setTokenInfo] = useState<any>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);


    const fetchTokenDetails = async (tokenAddress: string) => {
      try {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/ronin/tokens/${tokenAddress}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch token details');
        }
        
        const data = await response.json();
        
        if (data.data && data.data.attributes) {
          setTokenDetails(data.data.attributes);
        }
      } catch (error) {
        console.error("Error fetching token details:", error);
      }
    };

    const fetchTokenInfo = async (tokenAddress: string) => {
      try {
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/ronin/tokens/${tokenAddress}/info`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch token info');
        }
        
        const data = await response.json();
        
        if (data.data && data.data.attributes) {
          setTokenInfo(data.data.attributes);
        }
      } catch (error) {
        console.error("Error fetching token info:", error);
      }
    };
    
    
    // Add this to your existing useEffect or create a new one
    useEffect(() => {
      if (token?.address) {
        fetchTokenDetails(token.address);
        fetchTokenInfo(token.address);
      }
    }, [token?.address]);


  const tokenId = params.tokenId as string
    // Function to find pools for a token
    const findPoolForToken = async () => {
      try {
        // Update this line to use the correct API endpoint
        const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/ronin/tokens/${tokenId}/pools?page=1`)
      
        if (!response.ok) throw new Error('Failed to fetch pools')
      
        const data = await response.json()
      
        // If we have pools, use the first one (or the one with highest volume)
        if (data.data && data.data.length > 0) {
          // Find pool with highest liquidity or volume
          const topPool = data.data.reduce((prev: any, current: any) => {
            const prevVolume = parseFloat(prev.attributes.volume_usd?.h24 || '0')
            const currentVolume = parseFloat(current.attributes.volume_usd?.h24 || '0')
            return currentVolume > prevVolume ? current : prev
          }, data.data[0])
        
          // Return both address and name
          return {
            address: topPool.attributes.address,
            name: topPool.attributes.name
          }
        }
      
        return null
      } catch (error) {
        console.error("Error finding pool:", error)
        return null
      }
    }
    useEffect(() => {
      const fetchTokenAndTrades = async () => {
        setLoading(true)
        try {
          // First get pool info for the token
          let poolAddr = poolAddress
          let poolName = null // Initialize pool name variable
    
          if (!poolAddr) {
            // If we don't have a pool address, try to find one
            const poolInfo = await findPoolForToken()
            if (poolInfo) {
              poolAddr = poolInfo.address
              poolName = poolInfo.name // Store the pool name from findPoolForToken
              setPoolAddress(poolAddr)
            }
          }
    
          if (poolAddr) {
            // Get detailed pool info to get token details
            const poolResponse = await fetch(`https://api.geckoterminal.com/api/v2/networks/ronin/pools/${poolAddr}`)
            if (!poolResponse.ok) throw new Error('Failed to fetch pool data')
      
            const poolData = await poolResponse.json()
      
            // IMPORTANT: Always extract pool name from the pool data, whether initial load or refresh
            if (poolData.data && poolData.data.attributes && poolData.data.attributes.name) {
              poolName = poolData.data.attributes.name
            }

            const priceChangePercentage = poolData.data.attributes.price_change_percentage?.h24;
      
            // Extract token info from the pool data as before
            let baseToken = null
            let baseTokenId = ''

            if (poolData.data && poolData.data.relationships && 
                poolData.data.relationships.base_token && 
                poolData.data.relationships.base_token.data) {
              baseTokenId = poolData.data.relationships.base_token.data.id
        
              if (poolData.included && Array.isArray(poolData.included)) {
                baseToken = poolData.included.find((item: any) => item.id === baseTokenId)
              }
            }

            // Create token info with the pool name
            const tokenInfo = {
              id: baseTokenId || tokenId,
              // Use pool name if available, otherwise fallback to token name
              name: poolName || baseToken?.attributes?.name || tokenId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
              symbol: baseToken?.attributes?.symbol || tokenId.substring(0, 6).toUpperCase(),
              image: baseToken?.attributes?.image_url || '/token_logo.png',
              address: baseToken?.attributes?.address || tokenId,
              price_change_percentage_24h: priceChangePercentage // Add this line

            }
      
            // Set initial token info
            setToken(tokenInfo)

            // Important: Load token image first, wait for it to complete
            const tokenAddress = tokenInfo.address
            let finalImageUrl = tokenInfo.image
      
            if (tokenAddress) {
              try {
                // Create a promise that resolves when the image is loaded
                const imagePromise = new Promise<string>((resolve) => {
                  tokenImageService.getTokenImageUrl(tokenAddress, (imageUrl) => {
                    finalImageUrl = imageUrl
                    resolve(imageUrl)
                  })
                })
          
                // Wait for the image to load (or timeout after 2 seconds)
                const timeoutPromise = new Promise<string>((resolve) => {
                  setTimeout(() => resolve(finalImageUrl), 2000)
                })
          
                finalImageUrl = await Promise.race([imagePromise, timeoutPromise])
          
                // Update token with the loaded image
                setToken((prevToken: any) => ({
                  ...prevToken,
                  image: finalImageUrl
                }))
              } catch (error) {
                console.error("Error loading token image:", error)
              }
            }
      
            // Fetch trades after image is loaded
            const tradesResponse = await fetch(
              `https://api.geckoterminal.com/api/v2/networks/ronin/pools/${poolAddr}/trades`
            )            
            if (!tradesResponse.ok) throw new Error('Failed to fetch trades data')
      
            const tradesData = await tradesResponse.json()
      
            // Now use the final image URL for all trades
            let transformedTrades = tradesData.data.map((trade: GeckoTrade) => {
              const amount_token = trade.attributes.kind === "buy" 
                ? parseFloat(trade.attributes.to_token_amount) 
                : parseFloat(trade.attributes.from_token_amount)
          
              return {
                id: trade.id,
                type: trade.attributes.kind,
                amount_usd: parseFloat(trade.attributes.volume_in_usd),
                amount_token: amount_token,
                timestamp: trade.attributes.block_timestamp,
                tx_hash: trade.attributes.tx_hash,
                wallet_address: trade.attributes.tx_from_address,
                tokenImage: finalImageUrl // Use the resolved image URL here
              }
            })
      
            // Filter trades from the past 24 hours
            const now = new Date()
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
            transformedTrades = transformedTrades.filter((trade: Trade) => 
              new Date(trade.timestamp) >= yesterday
            )
      
            // Sort by amount_usd (largest first)
            transformedTrades.sort((a: Trade, b: Trade) => b.amount_usd - a.amount_usd)

      
            // Limit to 30 trades
            transformedTrades = transformedTrades.slice(0, tradeLimit)
      
            setTrades(transformedTrades)
          } else {
            throw new Error('No pool found for this token')
          }
        } catch (error) {
          console.error("Error fetching data:", error)
          // Generate mock data for testing
          // ...rest of your mock data logic
        } finally {
          setLoading(false)
        }
      }    
      fetchTokenAndTrades()
      
      // Setup refresh timer
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time to refresh data
            setRefreshing(true)
            fetchTokenAndTrades().finally(() => {
              setRefreshing(false)
              setTimeRemaining(30);
            })
            return 30
          }
          return prev - 1
        })
      }, 1000)
    
      return () => clearInterval(timer)
    }, [tokenId, poolAddress, tradeLimit])

  // Add this useEffect after your other useEffect hooks
  useEffect(() => {
    if (token?.image && trades.length > 0) {
      // Update all trades with the new token image
      setTrades(prevTrades => 
        prevTrades.map(trade => ({
          ...trade,
          tokenImage: token.image
        }))
      )
    }
  }, [token?.image])

  // Filter trades based on search and timeframe
  useEffect(() => {
    if (trades.length === 0) {
      setFilteredTrades([]);
      return;
    }
    
    let filtered = [...trades]
    
    // Filter by timeframe
    if (timeframe !== "h24") {
      const now = new Date()
      const timeLimit = new Date(now)
      
      switch (timeframe) {
        case "m5":
          timeLimit.setMinutes(now.getMinutes() - 5)
          break
        case "h1":
          timeLimit.setHours(now.getHours() - 1)
          break
        case "h6":
          timeLimit.setHours(now.getHours() - 6)
          break
      }
      
      filtered = filtered.filter(trade => new Date(trade.timestamp) >= timeLimit)
    }
    
    // Apply Up/Down filters
    if (showUpOnly) {
      filtered = filtered.filter(trade => trade.type === "buy")
    } else if (showDownOnly) {
      filtered = filtered.filter(trade => trade.type === "sell")
    }
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (trade) =>
          trade.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trade.tx_hash.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    // Set filteredTrades to empty array if no trades match the filters
    if (filtered.length === 0) {
    }
    
    setFilteredTrades(filtered);
  }, [trades, timeframe, searchQuery, showUpOnly, showDownOnly])
  
  const generateMockTrades = (mockToken: { id: string; name: string; symbol: string; current_price: number; image: string }): Trade[] => {
    return Array.from({ length: 20 }, (_, i) => {
      const isBuy = Math.random() > 0.5
      const amountUsd = Math.random() * 5000 + 100
      const amountToken = amountUsd / mockToken.current_price
      const minutesAgo = Math.floor(Math.random() * 1440) // Up to 24 hours ago
      const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
      
      return {
        id: `trade-${i}`,
        type: isBuy ? "buy" as const : "sell" as const,
        amount_usd: amountUsd,
        amount_token: amountToken,
        timestamp: timestamp,
        tx_hash: `0x${Math.random().toString(16).substring(2, 42)}`,
        wallet_address: `0x${Math.random().toString(16).substring(2, 42)}`
      }
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
  
  const handleTradeClick = (trade: Trade) => {
    window.open(`https://app.roninchain.com/tx/${trade.tx_hash}`, '_blank')
  }
  
  const handleViewChange = (value: "trades" | "transactions") => {
    setActiveView(value)
  }

  const handleTradeLimitChange = (newLimit: 10 | 25 | 50 | 100) => {
    setTradeLimit(newLimit)
  }

  // Handler for "Up only" filter
const handleShowUpOnlyChange = (value: boolean) => {
  setShowUpOnly(value)
  // If turning on "Up only", turn off "Down only"
  if (value) {
    setShowDownOnly(false)
  }
}

// Handler for "Down only" filter
const handleShowDownOnlyChange = (value: boolean) => {
  setShowDownOnly(value)
  // If turning on "Down only", turn off "Up only"
  if (value) {
    setShowUpOnly(false)
  }
}

const shareToTwitter = (crypto: any) => {
  const text = `Check out ${crypto.name} on Ronin Chain! ${window.location.origin}/token/${crypto.id}`
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
}

// Function to extract the token symbol from the name
const getTokenSymbol = (tokenName: string) => {
  // If the token name contains a slash, take only the part before the slash
  if (tokenName && tokenName.includes('/')) {
    return tokenName.split('/')[0].trim();
  }
  // Otherwise, use the symbol property or fallback to the name
  return token?.symbol || tokenName;
};


const renderTokenDetails = () => {
  if (!token) return <div className="p-4 text-center text-blue-300">Loading token details...</div>;
  
  // Format price based on its magnitude
  const formatPrice = (price: number) => {
    if (price < 0.0001) return price.toFixed(8);
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  
  // Format large numbers (for market cap, volume, etc.)
  const formatLargeNumber = (num: number) => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };
  
  // Calculate trading activity from trades
  const buyTrades = trades.filter(t => t.type === "buy");
  const sellTrades = trades.filter(t => t.type === "sell");
  const buyVolume = buyTrades.reduce((sum, t) => sum + t.amount_usd, 0);
  const sellVolume = sellTrades.reduce((sum, t) => sum + t.amount_usd, 0);

  // Inside renderTokenDetails function
// Calculate the timeframe of displayed trades
const getTradeTimeframe = () => {
  if (filteredTrades.length === 0) return "No trades";
  
  // Find the oldest trade in the filtered trades
  const oldestTrade = [...filteredTrades].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )[0];
  
  const oldestTime = new Date(oldestTrade.timestamp);
  const now = new Date();
  const diffMs = now.getTime() - oldestTime.getTime();
  
  // Convert to appropriate time unit
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) {
    return `last ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  } else if (diffMins < 1440) { // less than a day
    const hours = Math.floor(diffMins / 60);
    return `last ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffMins / 1440);
    return `last ${days} day${days !== 1 ? 's' : ''}`;
  }
};

const tradeTimeframe = getTradeTimeframe();

// Get price change percentage only from API data
const getPriceChangePercentage = () => {
  // Only use data from the API
  if (tokenDetails?.price_change_percentage_24h) {
    return parseFloat(tokenDetails.price_change_percentage_24h);
  }
  
  // Return null if we don't have accurate data
  return null;
};

const priceChangePercent = token?.price_change_percentage_24h ? parseFloat(token.price_change_percentage_24h) : null;
const hasAccurateData = priceChangePercent !== null;
const isPositive = hasAccurateData && priceChangePercent >= 0;

  
  return (
    <div className="p-4 text-blue-100">
    {/* Token Header with Price Change */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <img
          src={token.image || '/token_logo.png'}
          alt={token.name}
          className="w-10 h-10 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/token_logo.png';
          }}
        />
        <div>
          <h3 className="font-bold text-lg">{token.name}</h3>
          <p className="text-blue-300 text-sm">${getTokenSymbol(token.name)}</p>
        </div>
      </div>
      
      {/* Price Change Percentage - Only shown when we have accurate data */}
      {hasAccurateData && (
        <div className={`px-2 py-1 rounded ${isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          <span className="font-medium">
            {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
      
      {/* Categories/Tags */}
      {tokenInfo?.categories && tokenInfo.categories.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {tokenInfo.categories.map((category: string, index: number) => (
            <span 
              key={index} 
              className="text-xs bg-blue-800/50 text-blue-200 px-2 py-0.5 rounded-full"
            >
              {category}
            </span>
          ))}
        </div>
      )}
      
      {/* Description with expand/collapse functionality */}
      {tokenInfo && tokenInfo.description && (
        <div className="mb-3 text-sm text-blue-200 bg-blue-900/20 p-2 rounded">
          {tokenInfo.description.length > 100 ? (
            <>
              {isDescriptionExpanded 
                ? tokenInfo.description 
                : `${tokenInfo.description.substring(0, 100)}...`}
              <button 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="ml-1 text-blue-400 hover:text-blue-300 text-xs font-medium"
              >
                {isDescriptionExpanded ? 'Read less' : 'Read more'}
              </button>
            </>
          ) : (
            tokenInfo.description
          )}
        </div>
      )}

      
      {/* Social Links */}
      {(tokenInfo?.websites?.length > 0 || 
        tokenInfo?.twitter_handle || 
        tokenInfo?.discord_url || 
        tokenInfo?.telegram_handle) && (
        <div className="mb-4 flex gap-2">
          {tokenInfo?.websites?.length > 0 && (
            <a 
              href={tokenInfo.websites[0]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 bg-blue-800/50 rounded-full hover:bg-blue-700/50 transition-colors"
              title="Website"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </a>
          )}
          
          {tokenInfo?.twitter_handle && (
            <a 
              href={`https://x.com/${tokenInfo.twitter_handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 bg-blue-800/50 rounded-full hover:bg-blue-700/50 transition-colors"
              title="Twitter"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          
          {tokenInfo?.discord_url && (
            <a 
              href={tokenInfo.discord_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 bg-blue-800/50 rounded-full hover:bg-blue-700/50 transition-colors"
              title="Discord"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.39-.444.885-.608 1.283a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.283.077.077 0 0 0-.079-.036c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
              </svg>
            </a>
          )}
          
          {tokenInfo?.telegram_handle && (
            <a 
              href={`https://t.me/${tokenInfo.telegram_handle}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1.5 bg-blue-800/50 rounded-full hover:bg-blue-700/50 transition-colors"
              title="Telegram"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 mt-4">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.open(`https://app.roninchain.com/swap?outputCurrency=${token.address}`, '_blank')}
        >
          Buy ${getTokenSymbol(token.name)}
        </Button>
        
        <Button
          className="w-full bg-gray-700 hover:bg-gray-600 text-white"
          onClick={() => {
            if (poolAddress) {
              window.open(`https://www.geckoterminal.com/ronin/pools/${poolAddress}`, '_blank');
            } else {
              // Fallback if pool address isn't available
              window.open(`https://www.geckoterminal.com/ronin/tokens/${token.address}`, '_blank');
            }
          }}
        >
          <img 
            src="https://www.geckoterminal.com/favicon.ico" 
            alt="GeckoTerminal" 
            className="h-4 w-4 mr-2"
            onError={(e) => {
              // If the favicon fails to load, hide it
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          View on GeckoTerminal
        </Button>
      </div>
      <div className="space-y-2 mb-4"></div>
      
      
      {/* Token Price and Stats */}
      <div className="space-y-3 mb-4">
        {/* Price */}
        <div className="flex justify-between items-center">
          <span className="text-blue-300">Price:</span>
          <span className="font-bold">
            ${tokenDetails?.price_usd ? formatPrice(parseFloat(tokenDetails.price_usd)) : '-'}
          </span>
        </div>
        
        {/* Market Cap / FDV */}
        <div className="flex justify-between items-center">
          <span className="text-blue-300">Market Cap:</span>
          <span>
            {tokenDetails?.market_cap_usd ? formatLargeNumber(parseFloat(tokenDetails.market_cap_usd)) : 
             tokenDetails?.fdv_usd ? formatLargeNumber(parseFloat(tokenDetails.fdv_usd)) + ' (FDV)' : '-'}
          </span>
        </div>
        
        {/* Volume */}
        <div className="flex justify-between items-center">
          <span className="text-blue-300">24h Volume:</span>
          <span>
            {tokenDetails?.volume_usd?.h24 ? formatLargeNumber(parseFloat(tokenDetails.volume_usd.h24)) : '-'}
          </span>
        </div>
      
              {/* Liquidity */}
              <div className="flex justify-between items-center">
          <span className="text-blue-300">Liquidity:</span>
          <span>
            {tokenDetails?.total_reserve_in_usd ? formatLargeNumber(parseFloat(tokenDetails.total_reserve_in_usd)) : '-'}
          </span>
        </div>
        
        {/* Holders - if available */}
        {tokenInfo?.holders && (
          <div className="flex justify-between items-center">
            <span className="text-blue-300">Holders:</span>
            <span>{tokenInfo.holders.count?.toLocaleString() || '-'}</span>
          </div>
        )}
        
        {/* Contract */}
        <div className="flex justify-between items-center">
          <span className="text-blue-300">Contract:</span>
          <div className="flex items-center">
            <span className="text-sm truncate max-w-[120px]" title={token.address}>
              {token.address.substring(0, 6)}...{token.address.substring(token.address.length - 4)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-1 ml-1 text-blue-300 hover:text-blue-100 hover:bg-blue-800/50"
              onClick={() => {
                navigator.clipboard.writeText(token.address);
                // Optional: Add a toast notification here
              }}
              title="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Trade Statistics */}
      <div className="mb-4 pt-2 border-t border-blue-800">
        <h4 className="font-medium mb-2 text-blue-200">Recent Trading Activity ({tradeTimeframe})</h4>
                {/* Trading Sentiment - Full width row below the grid */}
                {buyVolume > 0 || sellVolume > 0 ? (
          <div className={`mt-2 p-2 rounded text-center ${
            buyVolume > sellVolume 
              ? 'bg-green-900/30 text-green-400' 
              : 'bg-red-900/30 text-red-400'
          }`}>
            <div className="text-xs mb-0.5">Trading Sentiment</div>
            <div className="font-medium">
              {buyVolume > sellVolume ? 'Bullish' : 'Bearish'}
              {' '}
              <span className="text-xs">
                ({Math.round((Math.max(buyVolume, sellVolume) / (buyVolume + sellVolume)) * 100)}%)
              </span>
            </div>
          </div>
        ) : null}
          </div>
        
        {/* Visible Trades Stats with actual timeframe */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-900/30 p-2 rounded">
            <div className="text-blue-300 text-xs">Buy Volume</div>
            <div className="font-medium text-green-400">${buyVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="bg-blue-900/30 p-2 rounded">
            <div className="text-blue-300 text-xs">Sell Volume</div>
            <div className="font-medium text-red-400">${sellVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>

  );
};

return (
  <div className="w-full pt-0 -mt-2">
    <Card className="w-full bg-[#0f2447] border-blue-800 text-blue-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        
      </CardHeader>
      
      <BubbleHeader
        title="Trades"
        activeView={activeView === "trades" ? "tokens" : "nfts"}
        onViewChange={(value) => {
          setActiveView(value === "tokens" ? "trades" : "transactions")
        }}          
        timeframe={timeframe}
        onTimeframeChange={(value) => setTimeframe(value)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showUpOnly={showUpOnly}
        onShowUpOnlyChange={handleShowUpOnlyChange}
        showDownOnly={showDownOnly}
        onShowDownOnlyChange={handleShowDownOnlyChange}
        tokenLimit={tradeLimit}
        onTokenLimitChange={handleTradeLimitChange}
        timeRemaining={timeRemaining}
        searchPlaceholder="Search by tx hash or wallet..."
        description={`${token?.name || 'Token'} Trading Activity`}
        hideBranding={true}
        hideBubbleSwitcher={true}
        tokenImage={token?.image}
        tokenName={token?.name}
        tokenSymbol={token?.symbol}
        showTokenInfo={true}
        onBackClick={() => router.push('/')}
      />
      
      <CardContent className="pt-1">
        {/* Responsive layout - stack vertically on mobile, side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row w-full h-[80vh] lg:h-[80vh]">
          {/* Main content - full width on mobile, 75-80% on desktop */}
          <div className="w-full lg:w-4/5 h-[60vh] lg:h-full relative bg-[#061325] rounded-md">
            {loading ? (
              <div className="flex flex-wrap justify-center gap-4 h-full items-center">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-full bg-blue-900/30" />
                ))}
              </div>
            ) : (
              <TradeBubblePhysics 
                trades={filteredTrades} 
                onTradeClick={handleTradeClick}
              />
            )}
          </div>
          
          {/* Side menu - full width on mobile, 20-25% on desktop */}
          <div className="w-full lg:w-1/5 h-[40vh] lg:h-full mt-2 lg:mt-0 lg:ml-2 bg-[#0a1c35] rounded-md border border-blue-800 overflow-y-auto">
            {renderTokenDetails()}
          </div>
        </div>
      </CardContent>

    </Card>
  </div>
)
}
