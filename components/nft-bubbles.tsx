"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import BubbleHeader from "@/components/bubble-header"

export default function NFTBubbles() {
  // State for managing view switching
  const [activeView, setActiveView] = useState<"tokens" | "nfts">("nfts")
  
  // Handle view change
  const handleViewChange = (value: "tokens" | "nfts" | "trades" | "transactions") => {
    // Only act on tokens/nfts toggles - ignore trades/transactions
    if (value === "tokens" || value === "nfts") {
      if (value === "tokens") {
        window.location.href = "/?view=tokens";
      }
    }
  }
  

  return (
    <div className="w-full pt-0 -mt-2">
      <Card className="w-full bg-[#0f2447] border-blue-800 text-blue-100">
        <BubbleHeader
          title="NFT"
          activeView={activeView}
          onViewChange={handleViewChange}
          timeframe="h24"
          onTimeframeChange={() => {}}
          showSearch={false}
          showFilters={false}
          description="Ronin NFT Performance Tracking"
          tooltipText="Track NFT performance with interactive bubble visualizations - coming soon!"
        />
        
        <CardContent className="pt-1">
          <div className="w-full h-[80vh] relative bg-[#061325] rounded-md flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-4xl md:text-6xl font-bold text-blue-100 mb-4">Coming Soon</h2>
              <p className="text-xl text-blue-300 max-w-md mx-auto">
                NFT Bubbles on Ronin are under development!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
