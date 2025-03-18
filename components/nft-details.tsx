"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CryptoBubbles from "@/components/crypto-bubbles"
import NFTBubbles from "@/components/nft-bubbles"

export default function BubbleSwitcher() {
  const [activeView, setActiveView] = useState<"tokens" | "nfts">("tokens")

  return (
    <div className="w-full">
      {/* Main view selector tabs */}
      <div className="flex justify-center mb-4">
        <Tabs
          value={activeView}
          onValueChange={(value) => setActiveView(value as "tokens" | "nfts")}
          className="w-auto"
        >
          <TabsList className="bg-blue-900/50">
            <TabsTrigger 
              value="tokens" 
              className="data-[state=active]:bg-blue-700 text-blue-100 px-6 py-2"
            >
              Token Bubbles
            </TabsTrigger>
            <TabsTrigger 
              value="nfts" 
              className="data-[state=active]:bg-blue-700 text-blue-100 px-6 py-2"
            >
              NFT Bubbles
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Render the appropriate component based on active view */}
      {activeView === "tokens" ? <CryptoBubbles /> : <NFTBubbles />}
    </div>
  )
}
