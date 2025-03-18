"use client"

import { useState, useEffect } from "react"
import CryptoBubbles from "@/components/crypto-bubbles"
import NFTBubbles from "@/components/nft-bubbles"

export default function BubbleSwitcher() {
  const [activeView, setActiveView] = useState<"tokens" | "nfts">("tokens")

  // Check URL parameters for view on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'nfts') {
      setActiveView('nfts');
    }
  }, []);

  // Render the appropriate component based on active view
  return activeView === "tokens" ? <CryptoBubbles /> : <NFTBubbles />
}
