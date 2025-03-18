"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, X, Info, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"


interface BubbleHeaderProps {
  // Essential props
  title: string;  // e.g., "Token" or "NFT"
  activeView: "tokens" | "nfts" | "trades" | "transactions"
  onViewChange: (value: "tokens" | "nfts" | "trades" | "transactions") => void
  timeframe: "m5" | "h1" | "h6" | "h24";
  onTimeframeChange: (value: "m5" | "h1" | "h6" | "h24") => void;
  
  // Optional props with defaults
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showUpOnly?: boolean;
  onShowUpOnlyChange?: (value: boolean) => void;
  showDownOnly?: boolean;
  onShowDownOnlyChange?: (value: boolean) => void;
  tokenLimit?: 10 | 25 | 50 | 100;
  onTokenLimitChange?: (value: 10 | 25 | 50 | 100) => void;
  timeRemaining?: number;
  onBackClick?: () => void;

  
  // For advanced customization
  searchPlaceholder?: string;
  description?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  tooltipText?: string;
  hideBranding?: boolean;
  hideBubbleSwitcher?: boolean;

  tokenImage?: string;
  tokenName?: string;
  tokenSymbol?: string;
  showTokenInfo?: boolean;
}
export default function BubbleHeader({
    title,
    activeView,
    onViewChange,
    timeframe,
    onTimeframeChange,
    searchQuery = "",
    onSearchChange = () => {},
    showUpOnly = false,
    onShowUpOnlyChange = () => {},
    showDownOnly = false,
    onShowDownOnlyChange = () => {},
    tokenLimit = 50,
    onTokenLimitChange = () => {},
    timeRemaining = 30,
    searchPlaceholder = `Search ${title.toLowerCase()}s...`,
    description = `Ronin ${title} Performance`,
    showSearch = true,
    showFilters = true,
    tooltipText = "Bubble size represents the magnitude of price change. Click empty space to repel bubbles. Click on a bubble for details.",
    hideBranding = false,
    hideBubbleSwitcher = false,
    tokenImage = "",
    tokenName = "",
    tokenSymbol = "",
    showTokenInfo = false,
    onBackClick,
  }: BubbleHeaderProps) {
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    
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
  
    return (
      <CardHeader className="pb-2 pt-2">
        {/* Top row with branding on left, switcher in center, and search on right */}
        <div className="grid grid-cols-3 items-center gap-3 mb-1">
          {/* Left side - Either branding or token info */}
          {showTokenInfo && tokenName ? (
            <div className="flex items-center gap-2 col-span-3 sm:col-span-1">
              {onBackClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-1 text-blue-300 hover:text-blue-100 hover:bg-blue-800/50"
                  onClick={onBackClick}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <img
                  src={tokenImage || '/token_logo.png'}
                  alt={tokenName}
                  className="w-6 h-6 sm:w-8 sm:h-8"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/token_logo.png'
                  }}
                />
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <h2 className="text-lg sm:text-xl font-bold text-white m-0">{tokenName} Trades</h2>
                  <span className="hidden sm:inline mx-2 text-blue-300">-</span>
                  <p className="text-xs sm:text-sm text-blue-300 m-0">Recent largest trading activity</p>
                </div>
              </div>
            </div>
          ) : !hideBranding && (
            // Original branding content
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-blue-100">
                Ronin Bubbles by{" "}
                <a href="https://x.com/masamune_CTO" target="_blank" rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 transition-colors">
                  Masamune.meme
                </a>
              </h1>
              <img 
                src="/masa_sword.png" 
                alt="Masamune Bubbles Logo" 
                className="w-9 h-9 md:w-10 md:h-10" 
              />
            </div>
          )}

        {hideBranding && !showTokenInfo && <div></div>} {/* Empty div to maintain grid layout */}

          {/* Center - Bubble Switcher (conditionally rendered) */}
          {!hideBubbleSwitcher && (
            <div className="hidden sm:flex justify-center">
              <Tabs
                value={activeView}
                onValueChange={(value) => onViewChange(value as "tokens" | "nfts")}
                className="w-auto"
              >
                <TabsList className="bg-blue-900/50">
                  <TabsTrigger 
                    value="tokens" 
                    className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white px-6 py-2"
                  >
                    Token Bubbles
                  </TabsTrigger>
                  <TabsTrigger 
                    value="nfts" 
                    className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white px-6 py-2"
                  >
                    NFT Bubbles
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          {hideBubbleSwitcher && <div></div>} {/* Empty div to maintain grid layout */}
        
        {/* Right side - Search bar (optional) - HIDDEN ON MOBILE */}
        <div className="flex justify-end">
          {showSearch ? (
            <div className="hidden sm:relative sm:block w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-300" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-8 pr-8 bg-blue-900/30 border-blue-700 text-blue-100 placeholder:text-blue-400"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-2 top-2.5" onClick={() => onSearchChange("")}>
                  <X className="h-4 w-4 text-blue-300" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-0 sm:w-[200px]"></div>
          )}
        </div>
      </div>
      
      {/* Second row with description on left and filters on right */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          {/* Left side - Performance text (only visible on larger screens) */}
          <div className="hidden sm:block max-w-[60%] text-blue-300 text-sm">
            <div className="inline-flex items-center group">
              <span className="font-semibold">{description} ({formatTimeframe(timeframe)})</span>
              <div className="relative inline-block ml-1.5">
                <Info className="h-4 w-4 text-blue-300 cursor-help" />
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 
                              w-64 p-2 bg-blue-950 text-blue-100 text-xs rounded shadow-lg border border-blue-700
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
                  {tooltipText}
                </div>
              </div>
            </div>
          </div>
          {/* Right side - Desktop filters */}
          <div className="hidden sm:flex flex-row gap-1">
            <Tabs
              value={timeframe}
              className="w-auto"
              onValueChange={(value) => onTimeframeChange(value as "m5" | "h1" | "h6" | "h24")}
            >
              <TabsList className="bg-blue-900/50">
                <TabsTrigger value="m5" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">5m</TabsTrigger>
                <TabsTrigger value="h1" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">1h</TabsTrigger>
                <TabsTrigger value="h6" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">6h</TabsTrigger>
                <TabsTrigger value="h24" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">24h</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex bg-blue-900/50 rounded-md p-0.5">
              <button
                onClick={() => {
                  const newUpOnlyValue = !showUpOnly;
                  onShowUpOnlyChange(newUpOnlyValue);
                  if (newUpOnlyValue && showDownOnly) onShowDownOnlyChange(false);
                }}
                className={`px-3 py-1 rounded-sm text-sm transition-colors ${
                  showUpOnly ? 'bg-blue-700 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                }`}
              >
                Up only 🟢
              </button>
              <button
                onClick={() => {
                  const newDownOnlyValue = !showDownOnly;
                  onShowDownOnlyChange(newDownOnlyValue);
                  if (newDownOnlyValue && showUpOnly) onShowUpOnlyChange(false);
                }}
                className={`px-3 py-1 rounded-sm text-sm ml-1 transition-colors ${
                  showDownOnly ? 'bg-blue-700 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                }`}
              >
                Down only 🔴
              </button>
            </div>
            
            <Tabs
              value={tokenLimit.toString()}
              className="w-auto"
              onValueChange={(value) => {
                onTokenLimitChange(parseInt(value) as 10 | 25 | 50 | 100);
              }}
            >
              <TabsList className="bg-blue-900/50">
                <TabsTrigger value="10" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">Top 10</TabsTrigger>
                <TabsTrigger value="25" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">Top 25</TabsTrigger>
                <TabsTrigger value="50" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">Top 50</TabsTrigger>
                <TabsTrigger value="100" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">Top 100</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}
      {/* Mobile Bubble Switcher - always visible on small screens */}
      {!hideBubbleSwitcher && (
          <div className="sm:hidden w-full mb-3 mt-2">
            <Tabs
              value={activeView}
              onValueChange={(value) => onViewChange(value as "tokens" | "nfts")}
              className="w-full"
            >
              <TabsList className="bg-blue-900/50 w-full">
                <TabsTrigger 
                  value="tokens" 
                  className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white py-2"
                >
                  Token Bubbles
                </TabsTrigger>
                <TabsTrigger 
                  value="nfts" 
                  className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white py-2"
                >
                  NFT Bubbles
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

      {/* Mobile filters - only visible when showFilters is true */}
      {showFilters && (
        <>
          {/* Mobile Search Bar - placed between switcher and filters */}
          {showSearch && (
            <div className="sm:hidden w-full mb-2">
              <div className="relative w-full">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-blue-300" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-8 pr-8 bg-blue-900/30 border-blue-700 text-blue-100 placeholder:text-blue-400"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <button className="absolute right-2 top-2.5" onClick={() => onSearchChange("")}>
                    <X className="h-4 w-4 text-blue-300" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile filters toggle */}
          <div className="sm:hidden w-full mb-1">
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-1 bg-blue-800/60 rounded-md text-blue-100 hover:bg-blue-700/70 transition-colors" 
            >
              <span>Filters</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {/* Collapsible filter menu for small screens with animations */}
            {isFilterMenuOpen && (
              <div className="mt-1 p-2 bg-blue-900/70 rounded-md border border-blue-800/50 shadow-lg">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Time Period</p>
                    <Tabs
                      value={timeframe}
                      className="w-full"
                      onValueChange={(value) => onTimeframeChange(value as "m5" | "h1" | "h6" | "h24")}
                    >
                      <TabsList className="bg-blue-900/50 w-full">
                        <TabsTrigger value="m5" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">5m</TabsTrigger>
                        <TabsTrigger value="h1" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">1h</TabsTrigger>
                        <TabsTrigger value="h6" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">6h</TabsTrigger>
                        <TabsTrigger value="h24" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">24h</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Direction</p>
                    <div className="flex bg-blue-900/50 rounded-md p-0.5 w-full">
                      <button
                        onClick={() => {
                          const newUpOnlyValue = !showUpOnly;
                          onShowUpOnlyChange(newUpOnlyValue);
                          if (newUpOnlyValue && showDownOnly) onShowDownOnlyChange(false);
                        }}
                        className={`flex-1 px-3 py-1 rounded-sm text-sm transition-colors ${
                          showUpOnly ? 'bg-blue-700 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                        }`}
                      >
                        Up only 🟢
                      </button>
                      <button
                        onClick={() => {
                          const newDownOnlyValue = !showDownOnly;
                          onShowDownOnlyChange(newDownOnlyValue);
                          if (newDownOnlyValue && showUpOnly) onShowUpOnlyChange(false);
                        }}
                        className={`flex-1 px-3 py-1 rounded-sm text-sm ml-1 transition-colors ${
                          showDownOnly ? 'bg-blue-700 text-blue-100' : 'text-blue-300 hover:text-blue-100'
                        }`}
                      >
                        Down only 🔴
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-blue-300 mb-1">{title} Count</p>
                    <Tabs
                      value={tokenLimit.toString()}
                      className="w-full"
                      onValueChange={(value) => {
                        onTokenLimitChange(parseInt(value) as 10 | 25 | 50 | 100);
                      }}
                    >
                      <TabsList className="bg-blue-900/50 w-full">
                        <TabsTrigger value="10" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">10</TabsTrigger>
                        <TabsTrigger value="25" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">25</TabsTrigger>
                        <TabsTrigger value="50" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">50</TabsTrigger>
                        <TabsTrigger value="100" className="flex-1 data-[state=active]:bg-blue-700 data-[state=active]:text-white text-white">100</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile description - only visible on small screens */}
          <div className="sm:hidden relative mt-1 mb-3">
            <div className="inline-flex items-center group">
              <span className="text-blue-300 text-sm font-semibold">{description} ({formatTimeframe(timeframe)})</span>
              <div className="relative inline-block ml-1.5">
                <Info className="h-4 w-4 text-blue-300 cursor-help" />
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 
                              w-64 p-2 bg-blue-950 text-blue-100 text-xs rounded shadow-lg border border-blue-700
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
                  {tooltipText}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Refresh timer - just the progress bar */}
      <div className="text-blue-300 mt-0">
        <div className="w-full bg-blue-900/30 h-1 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-400 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeRemaining / 30) * 100}%` }}
          />
        </div>
      </div>
    </CardHeader>
  )
}
  