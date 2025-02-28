"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, TrendingUp, TrendingDown, DollarSign, BarChart3, LineChart } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CryptoData } from "./crypto-bubbles"


interface CryptoDetailsProps {
  crypto: CryptoData
  timeframe: "m5" | "h1" | "h6" | "h24"
  onClose: () => void
  shareToTwitter: (crypto: CryptoData) => void  // Add this line
}

export default function CryptoDetails({ crypto, timeframe, onClose, shareToTwitter }: CryptoDetailsProps) {
  // Get percentage change based on selected timeframe
  const getPercentageChange = () => {
    switch (timeframe) {
      case "m5":
        return crypto.price_change_percentage_m5
      case "h1":
        return crypto.price_change_percentage_h1
      case "h6":
        return crypto.price_change_percentage_h6
      case "h24":
        return crypto.price_change_percentage_h24
      default:
        return crypto.price_change_percentage_h24
    }
  }

  const percentChange = getPercentageChange()
  const isPositive = percentChange >= 0

  // Format timeframe label for display
  const getTimeframeLabel = () => {
    switch (timeframe) {
      case "m5": return "5 minutes"
      case "h1": return "1 hour"
      case "h6": return "6 hours"
      case "h24": return "24 hours"
      default: return "24 hours"
    }
  }

  // Add this function to the CryptoDetails component
  const formatPrice = (price: number) => {
    // For very small numbers (less than 0.0001), show more decimal places
    if (price < 0.0001) {
      return `${price.toFixed(8)}`
    }
    // For small numbers (less than 0.01), show 6 decimal places
    else if (price < 0.01) {
      return `${price.toFixed(6)}`
    }
    // For small to medium numbers (less than 1), show 4 decimal places
    else if (price < 1) {
      return `${price.toFixed(4)}`
    }
    // For medium numbers (less than 1000), show 2 decimal places
    else if (price < 1000) {
      return `${price.toFixed(2)}`
    }
    // For large numbers, use the existing formatCurrency function
    else {
      return formatCurrency(price)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-[#0f2447] border-blue-700 text-blue-100">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-blue-300 hover:text-blue-100 hover:bg-blue-800/50"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img
                src={crypto.image || '/token_logo.png'}
                alt={crypto.name}
                className="w-10 h-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/token_logo.png';
                }}
              />
              <div>
                <CardTitle>{crypto.name}</CardTitle>
                <CardDescription className="text-blue-300">
                  {crypto.symbol.toUpperCase()}
                </CardDescription>
                <CardDescription className="text-blue-300/70 text-xs mt-1 font-mono">
                  CA: {crypto.id}
                </CardDescription>
              </div>
            </div>
            {/* Remove or comment out the pool count badge */}
            {/* 
            {crypto.pool_count && crypto.pool_count > 1 && (
              <Badge className="mt-2 bg-blue-800/70 text-blue-200">
                {crypto.pool_count} active pools
              </Badge>
            )}
            */}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-300" />
                <span className="text-blue-300">Price (USD)</span>
              </div>
              <span className="font-bold text-xl">{formatPrice(crypto.current_price)}</span>
            </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-blue-300">Change ({getTimeframeLabel()})</span>
                </div>
                <Badge
                  variant={isPositive ? "secondary" : "destructive"}
                  className={isPositive ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}
                >
                  {isPositive ? "+" : ""}
                  {percentChange.toFixed(2)}%
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-300" />
                  <span className="text-blue-300">Market Cap</span>
                </div>
                <span className="font-medium">{formatCurrency(crypto.market_cap)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-300" />
                  <span className="text-blue-300">Volume (24h)</span>
                </div>
                <span className="font-medium">{formatCurrency(crypto.total_volume)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                // Extract the token address from crypto.id (handling prefixed addresses)
                const tokenAddress = crypto.id;
          
                // Open the Ronin swap page with the token as the output currency
                window.open(`https://app.roninchain.com/swap?outputCurrency=${tokenAddress}`, '_blank');
              }}
            >
              Buy {crypto.symbol.toUpperCase()}
            </Button>
            
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => shareToTwitter(crypto)}
            >
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share to X
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  )
}