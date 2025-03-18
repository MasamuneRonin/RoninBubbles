"use client"

import { useRef, useEffect, useCallback } from "react"

interface Trade {
  id: string
  type: "buy" | "sell"
  amount_usd: number
  amount_token: number
  timestamp: string
  tx_hash: string
  wallet_address?: string
  tokenImage?: string
}

interface BubblePhysics {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  trade: Trade
}

interface TradeBubblePhysicsProps {
  trades: Trade[]
  onTradeClick: (trade: Trade) => void
}

export default function TradeBubblePhysics({ trades, onTradeClick }: TradeBubblePhysicsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubbles = useRef<BubblePhysics[]>([])
  const animationRef = useRef<number>(0)
  const isInitializedRef = useRef<boolean>(false)
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
    // Add/update this effect to properly load images
    useEffect(() => {
      // Load default token image
      if (!imageCache.current.has('default')) {
        const defaultImg = new Image()
        defaultImg.src = '/token_logo.png'
        defaultImg.onload = () => {
          imageCache.current.set('default', defaultImg)
        }
      }

      // Load images for all trades that have tokenImage property
      trades.forEach(trade => {
        if (trade.tokenImage && !imageCache.current.has(trade.tokenImage)) {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = trade.tokenImage
          
          img.onload = () => {
            imageCache.current.set(trade.tokenImage!, img)
          }
          
          img.onerror = () => {
            console.error(`Failed to load image: ${trade.tokenImage}`)
            // Set a fallback or null for this image
            imageCache.current.set(trade.tokenImage!, imageCache.current.get('default')!)
          }
        }
      })
    }, [trades])
  // Calculate bubble size based on USD amount and data distribution
  const getBubbleSize = useCallback((amount: number, allTrades: Trade[]) => {
    // Get the canvas dimensions for responsive sizing
    const canvas = canvasRef.current
    if (!canvas) return 40
    
    // Check if we're on a mobile device
    const isMobile = window.innerWidth < 768
    
    // Calculate base size factor relative to canvas dimensions
    const canvasArea = canvas.width * canvas.height
    const scaleFactor = Math.sqrt(canvasArea) / 1000 // Normalize for reference screen
    
    // Fine-tuned sizing for mobile/desktop
    const minSize = isMobile ? 30 * scaleFactor : 30 * scaleFactor
    const maxSize = isMobile ? 70 * scaleFactor : 70 * scaleFactor
    
    // Smaller boost to avoid making bubbles too big
    const mobileBoost = isMobile ? 10 : 0
    
    // Find the max and min amounts
    const maxAmount = Math.max(...allTrades.map(t => t.amount_usd))
    const minAmount = Math.min(...allTrades.map(t => t.amount_usd))
    
    // If all trades have the same amount, return a standard size
    if (maxAmount === minAmount) return (minSize + maxSize) / 2 + mobileBoost
    
    // Calculate size ratio (normalized between 0 and 1)
    const sizeRatio = (amount - minAmount) / (maxAmount - minAmount)
    
    // Use a square root function to give better visibility to smaller amounts
    const normalizedSize = Math.sqrt(sizeRatio) * 0.7 + sizeRatio * 0.3
    
    // Calculate final size between min and max
    const size = minSize + normalizedSize * (maxSize - minSize) + mobileBoost
    
    return size
  }, [])

  // Initialize or update bubbles based on new data
  const initializeOrUpdateBubbles = useCallback(() => {
    if (!canvasRef.current) return
    
    // Check if trades array is empty - CLEAR ALL BUBBLES
    if (trades.length === 0) {
      bubbles.current = []; // Clear all bubbles when no trades match the filter
      return;
    }
    
    const canvas = canvasRef.current
    
    // Create trades map for faster reference
    const tradesById = new Map(
      trades.map(trade => [trade.id, trade])
    )
    
    // Only do full initialization if this is first render or bubbles are empty
    if (!isInitializedRef.current || bubbles.current.length === 0) {
      // Initial creation of bubbles
      bubbles.current = trades.map((trade) => {
        const radius = getBubbleSize(trade.amount_usd, trades)
        
        const margin = radius * 1.2
        const availableWidth = canvas.width - margin * 2
        const availableHeight = canvas.height - margin * 2
        
        return {
          x: margin + Math.random() * availableWidth,
          y: margin + Math.random() * availableHeight,
          vx: (Math.random() - 0.5) * 0.5, 
          vy: (Math.random() - 0.5) * 0.5,
          radius,
          trade,
        }
      })
      
      isInitializedRef.current = true
    } else {
      // Create a map of existing bubbles by trade ID
      const existingBubblesMap = new Map(
        bubbles.current.map(bubble => [bubble.trade.id, bubble])
      )
      
      // Create a set to track which bubbles are still in the data
      const updatedIds = new Set<string>()
      
      // Update existing bubbles in-place without recreating the array
      bubbles.current.forEach(bubble => {
        const id = bubble.trade.id
        const newTradeData = tradesById.get(id)
        
        if (newTradeData) {
          // Update the trade data without changing position or velocity
          const radius = getBubbleSize(newTradeData.amount_usd, trades)
          
          // Update bubble properties but keep position and velocity
          bubble.trade = newTradeData
          bubble.radius = radius
          
          // Mark this ID as updated
          updatedIds.add(id)
        }
      })
      
      // Add new bubbles that don't exist yet
      const newBubbles = trades
        .filter(trade => !existingBubblesMap.has(trade.id))
        .map(trade => {
          const radius = getBubbleSize(trade.amount_usd, trades)
          
          const margin = radius * 1.2
          const availableWidth = canvas.width - margin * 2
          const availableHeight = canvas.height - margin * 2
          
          return {
            x: margin + Math.random() * availableWidth,
            y: margin + Math.random() * availableHeight,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius,
            trade,
          }
        })
      
      // Add new bubbles to the existing array
      if (newBubbles.length > 0) {
        bubbles.current.push(...newBubbles)
      }
      
      // Remove bubbles that no longer exist in the data
      bubbles.current = bubbles.current.filter(bubble => 
        updatedIds.has(bubble.trade.id) || 
        tradesById.has(bubble.trade.id)
      )
    }
  }, [trades, getBubbleSize])

  // Handle canvas resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
        
        // Re-initialize if needed
        if ((!isInitializedRef.current || bubbles.current.length === 0) && trades.length > 0) {
          initializeOrUpdateBubbles()
        }
      }
    }
    
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    
    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [trades.length, initializeOrUpdateBubbles])

  // Update bubbles data when trades change
  useEffect(() => {
    if (trades.length > 0) {
      initializeOrUpdateBubbles()
    }
  }, [trades, initializeOrUpdateBubbles])

  // Animation and rendering loop
  useEffect(() => {
    if (!canvasRef.current) return
  
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
  
    // Clear the canvas immediately if there are no trades
    if (trades.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Reset bubbles array
      bubbles.current = [];
      return; // Exit early, don't set up animation
    }
  
    // Format currency for display
    const formatCurrency = (amount: number): string => {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`
      } else {
        return `$${amount.toFixed(0)}`
      }
    }
  
    // Format time ago
    const formatTimeAgo = (timestamp: string): string => {
      const tradeTime = new Date(timestamp)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - tradeTime.getTime()) / (1000 * 60))
    
      if (diffMinutes < 1) return 'just now'
      else if (diffMinutes < 60) return `${diffMinutes}m ago`
      else {
        const diffHours = Math.floor(diffMinutes / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        else return `${Math.floor(diffHours / 24)}d ago`
      }
    }
  
    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw each bubble
      bubbles.current.forEach((bubble, index) => {
        // Update position
        bubble.x += bubble.vx
        bubble.y += bubble.vy

        // Boundary collision
        if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > canvas.width) {
          bubble.vx *= -0.8
          bubble.x = Math.max(bubble.radius, Math.min(canvas.width - bubble.radius, bubble.x))
        }

        if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > canvas.height) {
          bubble.vy *= -0.8
          bubble.y = Math.max(bubble.radius, Math.min(canvas.height - bubble.radius, bubble.y))
        }

        // Apply friction
        bubble.vx *= 0.99
        bubble.vy *= 0.99

        // Add slight random movement
        if (Math.random() < 0.05) {
          bubble.vx += (Math.random() - 0.5) * 0.2
          bubble.vy += (Math.random() - 0.5) * 0.2
        }

        // Bubble collision
        for (let j = index + 1; j < bubbles.current.length; j++) {
          const other = bubbles.current[j]
          const dx = other.x - bubble.x
          const dy = other.y - bubble.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDistance = bubble.radius + other.radius

          if (distance < minDistance) {
            // Calculate collision response
            const angle = Math.atan2(dy, dx)
            const targetX = bubble.x + Math.cos(angle) * minDistance
            const targetY = bubble.y + Math.sin(angle) * minDistance
            const ax = (targetX - other.x) * 0.05
            const ay = (targetY - other.y) * 0.05

            bubble.vx -= ax
            bubble.vy -= ay
            other.vx += ax
            other.vy += ay
          }
        }
      
        // Draw bubble
        const isBuy = bubble.trade.type === 'buy'
      
        // Determine intensity based on relative size
        const maxRadius = Math.max(...bubbles.current.map(b => b.radius))
        const intensity = bubble.radius / maxRadius
      
        // Draw bubble background
        ctx.beginPath()
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2)
      
        // Set fill style based on trade type with adjusted transparency
        // Set fill style based on trade type with adjusted transparency
        if (isBuy) {
          ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`; // Green for buys
        } else {
          ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.2})`; // Red for sells
        }
        ctx.fill()
      
        // Add neon glow effect
        const glowSize = 1.5 + intensity * 2;
        ctx.shadowBlur = 12;
      
        // Set glow color based on trade type
        if (isBuy) {
          ctx.shadowColor = "rgba(34, 197, 94, 0.9)"; // Green for buys
          ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
        } else {
          ctx.shadowColor = "rgba(239, 68, 68, 0.9)"; // Red for sells
          ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
        }
      
        ctx.lineWidth = glowSize;
        ctx.stroke();
      
        // Reset shadow for text and image
        ctx.shadowBlur = 0;

        // Draw token image
        const isMobile = window.innerWidth < 768;

        // Calculate icon size and position
        let iconSize = isMobile ? bubble.radius * 0.7 : bubble.radius * 0.5;

        // Special handling for tiny bubbles on mobile
        if (isMobile && bubble.radius < 35) {
          iconSize = Math.max(iconSize, 20);
        }

        // Position the icon higher in the bubble
        const iconYOffset = isMobile ? bubble.radius * 0.45 : bubble.radius * 0.4;

        // Get the image to display
        let img = null;

        // First try to get the token image
        if (bubble.trade.tokenImage && imageCache.current.has(bubble.trade.tokenImage)) {
          img = imageCache.current.get(bubble.trade.tokenImage);
        } 
        // Fall back to default if no token image is available
        if (!img) {
          img = imageCache.current.get('default');
        }

        // Draw the image if available
        if (img && img.complete && img.naturalHeight !== 0) {
          try {
            ctx.drawImage(
              img,
              bubble.x - iconSize / 2,
              bubble.y - iconSize / 2 - iconYOffset,
              iconSize,
              iconSize
            );
          } catch (error) {
            console.error("Error drawing image:", error);
          }
        }
        // Add text shadow for better contrast
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      
        // Draw amount text for all bubbles
        const amountFontSize = Math.min(bubble.radius * 0.3, 18);
        ctx.font = `bold ${amountFontSize}px Arial`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
      
        // Format and draw the USD amount
        const amountText = formatCurrency(bubble.trade.amount_usd);
        ctx.fillText(amountText, bubble.x, bubble.y + bubble.radius * 0.1);
      
        // Draw timestamp for all bubbles - removed size condition
        const timeText = formatTimeAgo(bubble.trade.timestamp);
      
        // Scale font size based on bubble size, but keep it readable
        const timeFontSize = Math.max(
          Math.min(bubble.radius * 0.2, 14),  // Cap at 14px
          bubble.radius > 25 ? 8 : 7          // Minimum size based on bubble size
        );
      
        ctx.font = `${timeFontSize}px Arial`;
        ctx.fillStyle = "rgba(148, 163, 184, 0.9)"; // Light blue/gray
      
        // Position time text based on bubble size
        const timeYOffset = bubble.radius > 40 
          ? bubble.radius * 0.4  // For larger bubbles
          : bubble.radius * 0.35; // For smaller bubbles, position it closer to center
        
        ctx.fillText(timeText, bubble.x, bubble.y + timeYOffset);
      
        // Reset shadow for subsequent rendering
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });
    
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle canvas click for bubble selection
    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if clicked on a bubble
      let clickedOnBubble = false;

      for (const bubble of bubbles.current) {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bubble.radius) {
          onTradeClick(bubble.trade);
          clickedOnBubble = true;
          break;
        }
      }

      // If clicked on empty space, apply repulsion
      if (!clickedOnBubble) {
        bubbles.current.forEach((bubble) => {
          const dx = bubble.x - x;
          const dy = bubble.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Apply force inversely proportional to distance
          const force = 200 / Math.max(1, distance);
          const angle = Math.atan2(dy, dx);

          bubble.vx += Math.cos(angle) * force;
          bubble.vy += Math.sin(angle) * force;
        });
      }
    };

    canvas.addEventListener("click", handleCanvasClick);

    // Clean up
    return () => {
      canvas.removeEventListener("click", handleCanvasClick);
      cancelAnimationFrame(animationRef.current);
    };
  }, [trades, onTradeClick]);  // Add trades back to dependencies
  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />;
}

