"use client"

import { useRef, useEffect, useCallback } from "react"

interface CryptoData {
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

interface BubblePhysics {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  crypto: CryptoData
  percentChange: number
}

interface CryptoBubblePhysicsProps {
  cryptoData: CryptoData[]
  timeframe: "m5" | "h1" | "h6" | "h24"
  onBubbleClick: (crypto: CryptoData) => void
  getPriceChangeForTimeframe: (crypto: CryptoData) => number
}

interface BubblePhysics {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  crypto: CryptoData
  percentChange: number
}

interface CryptoBubblePhysicsProps {
  cryptoData: CryptoData[]
  timeframe: "m5" | "h1" | "h6" | "h24"
  onBubbleClick: (crypto: CryptoData) => void
  getPriceChangeForTimeframe: (crypto: CryptoData) => number
}

export default function CryptoBubblePhysics({ 
  cryptoData, 
  timeframe, 
  onBubbleClick,
  getPriceChangeForTimeframe 
}: CryptoBubblePhysicsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubbles = useRef<BubblePhysics[]>([])
  const animationRef = useRef<number>(0)
  const imageCache = useRef<Map<string, HTMLImageElement | null>>(new Map())

  // Get percentage change based on selected timeframe
  const getPercentageChange = useCallback(
    (crypto: CryptoData) => {
      return getPriceChangeForTimeframe(crypto)
    },
    [getPriceChangeForTimeframe],
  )

  // Calculate bubble size based on percentage change and data distribution
  const getBubbleSize = useCallback(
    (percentChange: number, cryptoData: CryptoData[]) => {
      // Get the canvas dimensions for responsive sizing
      const canvas = canvasRef.current
      if (!canvas) return 40
      
      // Calculate base size factor relative to canvas dimensions
      const canvasArea = canvas.width * canvas.height
      const scaleFactor = Math.sqrt(canvasArea) / 1000 // Normalize for a reference 1000x1000 screen
      
      // Calculate minimum and maximum bubble sizes based on screen dimensions
      const minSize = 30 * scaleFactor
      const maxSize = 70 * scaleFactor
      
      // Calculate the absolute percentage change (we care about magnitude, not direction)
      const absChange = Math.abs(percentChange)
      
      // Cap the percentage change at 100% for sizing purposes
      const cappedPercentChange = Math.min(absChange, 100)
      
      // Linear scaling between 0% (minimum size) and 100% (maximum size)
      const sizeRatio = cappedPercentChange / 100
      
      // Calculate the bubble size with a slight non-linear scaling to make smaller changes more visible
      // Using a mix of linear and square root to create a slight curve
      const normalizedSize = Math.sqrt(sizeRatio) * 0.7 + sizeRatio * 0.3
      
      // Calculate final size between min and max
      const size = minSize + normalizedSize * (maxSize - minSize)
      
      return size
    },
    [/* dependencies removed for brevity */],
  )  

  useEffect(() => {
    cryptoData.forEach((crypto) => {
      // This condition needs to be fixed to properly detect image changes
      const currentCachedImage = imageCache.current.get(crypto.id);
      const hasImageChanged = currentCachedImage?.src !== crypto.image;
      
      if (!currentCachedImage || hasImageChanged) {
        // console.log(`Loading new image for ${crypto.symbol}: ${crypto.image}`);
        
        // Create a new image
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        // Set up error handling
        img.onerror = () => {
          // console.error(`Failed to load image for ${crypto.symbol}`);
          const fallbackImg = new Image();
          fallbackImg.src = '/token_logo.png';
          imageCache.current.set(crypto.id, fallbackImg);
        };
        
        // Important: Set onload handler BEFORE setting src
        img.onload = () => {
          // console.log(`Image loaded successfully for ${crypto.symbol}`);
          // Only update cache after successful load
          imageCache.current.set(crypto.id, img);
        };
        
        // Set the src AFTER adding event handlers
        img.src = crypto.image;
      }
    });
  }, [cryptoData]); // Re-run when cryptoData changes  // Initialize canvas and animation
  useEffect(() => {
    if (!canvasRef.current || cryptoData.length === 0) return
  
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
  
    // Initialize bubbles - modified to preserve positions
    const initBubbles = () => {
      // If bubbles already exist, preserve their positions and physical properties
      if (bubbles.current.length > 0) {
        // Create a map of existing bubbles by crypto ID for quick lookup
        const existingBubblesMap = new Map(
          bubbles.current.map(bubble => [bubble.crypto.id, bubble])
        );
  
        bubbles.current = cryptoData.map((crypto) => {
          const percentChange = getPercentageChange(crypto)
          const radius = getBubbleSize(percentChange, cryptoData)
          
          // If we already have this bubble, preserve its position and velocity
          const existingBubble = existingBubblesMap.get(crypto.id);
          if (existingBubble) {
            return {
              ...existingBubble,
              radius, // Update radius in case percentage changed
              crypto, // Update with latest crypto data (including image)
              percentChange, // Update percentage change
            };
          }
          
          // For new bubbles, initialize with random position
          const margin = radius * 1.2
          const availableWidth = canvas.width - margin * 2
          const availableHeight = canvas.height - margin * 2
          
          return {
            x: margin + Math.random() * availableWidth,
            y: margin + Math.random() * availableHeight,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius,
            crypto,
            percentChange,
          }
        })
      } else {
        // Initial creation of bubbles (first render)
        bubbles.current = cryptoData.map((crypto) => {
          const percentChange = getPercentageChange(crypto)
          const radius = getBubbleSize(percentChange, cryptoData)
          
          const margin = radius * 1.2
          const availableWidth = canvas.width - margin * 2
          const availableHeight = canvas.height - margin * 2
          
          return {
            x: margin + Math.random() * availableWidth,
            y: margin + Math.random() * availableHeight,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius,
            crypto,
            percentChange,
          }
        })
      }
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height

        // Reinitialize bubbles when canvas is resized
        initBubbles()
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Initialize bubbles
    initBubbles()

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
        const isPositive = bubble.percentChange >= 0
        const absChange = Math.abs(bubble.percentChange)
        const isNearZero = absChange < 0.5  // Slightly narrower range for zero

        // Analyze the distribution to identify outliers
        const percentChanges = bubbles.current.map(b => Math.abs(b.percentChange))
        const sortedChanges = [...percentChanges].sort((a, b) => a - b)
        const maxChange = Math.max(...percentChanges)
        const minChange = Math.min(...percentChanges)
        const avgChange = percentChanges.reduce((sum, val) => sum + val, 0) / percentChanges.length
        const dataRange = maxChange - minChange

        // Determine if values are close together
        const valuesAreClose = dataRange < avgChange * 0.5

        // Find the largest gap in the data
        const startIndex = Math.max(1, Math.floor(sortedChanges.length * 0.1))
        let maxGap = 0
        for (let i = startIndex; i < sortedChanges.length; i++) {
          const gap = sortedChanges[i] - sortedChanges[i-1]
          if (gap > maxGap) {
            maxGap = gap
          }
        }

        // Determine if we have significant gaps in the data
        const hasSignificantGaps = maxGap > dataRange * 0.2

        // Calculate gap threshold and outlier factor
        const gapThreshold = hasSignificantGaps ? 
          sortedChanges[sortedChanges.length - 1] - maxGap : maxChange
        let outlierFactor = 0

        if (hasSignificantGaps && !valuesAreClose && absChange > gapThreshold) {
          outlierFactor = Math.min(1, (absChange - gapThreshold) / maxGap)
        }

        // Calculate intensity based on both percentage change and outlier factor
        const intensity = Math.min(0.8, (absChange / maxChange) * 0.6 + outlierFactor * 0.4)

        // Calculate normalized percentage change on a scale of -1 to 1
        // where -1 is the most negative, 0 is neutral, and 1 is the most positive
        const normalizedChange = isPositive 
          ? Math.min(1, bubble.percentChange / 10) // Cap at 10% for positive
          : Math.max(-1, bubble.percentChange / 10) // Cap at -10% for negative

        // Determine glow color based on the normalized change using a gradient
        let glowColor;

        if (isNearZero) {
          // White for values very close to zero
          glowColor = "rgba(255, 255, 255, 0.8)";
        } else if (isPositive) {
          if (normalizedChange < 0.3) {
            // Light green for small positive changes
            glowColor = "rgba(134, 239, 172, 0.9)"; // Light green
          } else if (normalizedChange < 0.6) {
            // Medium green
            glowColor = "rgba(74, 222, 128, 0.9)";
          } else {
            // Bright green for larger positive changes
            glowColor = outlierFactor > 0 
              ? "rgba(22, 163, 74, 0.95)" // Intense green for outliers
              : "rgba(34, 197, 94, 0.9)"; // Regular green
          }
        } else {
          // For negative values
          if (normalizedChange > -0.3) {
            // Orange for small negative changes
            glowColor = "rgba(251, 146, 60, 0.9)"; // Orange
          } else if (normalizedChange > -0.6) {
            // Dark orange/red-orange for medium negative changes
            glowColor = "rgba(249, 115, 22, 0.9)";
          } else {
            // Red for larger negative changes
            glowColor = outlierFactor > 0 
              ? "rgba(185, 28, 28, 0.95)" // Intense red for outliers
              : "rgba(239, 68, 68, 0.9)"; // Regular red
          }
        }

        // Draw bubble background with subtle fill matching the glow color gradient
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);

        if (isNearZero) {
          // White fill for near zero
          ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + intensity * 0.1})`;
        } else if (isPositive) {
          if (normalizedChange < 0.3) {
            // Light green fill
            ctx.fillStyle = `rgba(134, 239, 172, ${0.1 + intensity * 0.2})`;
          } else if (normalizedChange < 0.6) {
            // Medium green fill
            ctx.fillStyle = `rgba(74, 222, 128, ${0.1 + intensity * 0.2})`;
          } else {
            // Bright green fill
            ctx.fillStyle = `rgba(34, 197, 94, ${0.1 + intensity * 0.2})`;
          }
        } else {
          if (normalizedChange > -0.3) {
            // Orange fill
            ctx.fillStyle = `rgba(251, 146, 60, ${0.1 + intensity * 0.2})`;
          } else if (normalizedChange > -0.6) {
            // Dark orange fill
            ctx.fillStyle = `rgba(249, 115, 22, ${0.1 + intensity * 0.2})`;
          } else {
            // Red fill
            ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + intensity * 0.2})`;
          }
        }

        ctx.fill();

        // Add neon glow effect with enhancement for outliers
        const glowSize = 1.5 + intensity * 2 + outlierFactor * 3;
        ctx.shadowBlur = 12 + outlierFactor * 8;
        ctx.shadowColor = glowColor;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = glowSize;
        ctx.stroke();
        // Reset shadow for text and image
        ctx.shadowBlur = 0
        
        // Draw crypto icon if available - positioned above the text
        // Increase icon spacing - move it higher in the bubble
        const img = imageCache.current.get(bubble.crypto.id)
        if (img && img.complete && img.naturalHeight !== 0) {
          try {
            const iconSize = bubble.radius * 0.5
            ctx.drawImage(
              img,
              bubble.x - iconSize / 2,
              bubble.y - iconSize / 2 - bubble.radius * 0.4,
              iconSize,
              iconSize,
            )
          } catch (error) {
            // console.error(`Failed to draw image for ${bubble.crypto.symbol}:`, error)
            // Don't set to null, just log the error
            // imageCache.current.set(bubble.crypto.id, null)
          }
        }

        ctx.fillStyle = "#ffffff"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        
        // Get the symbol text and prepare percentage text
        const symbolText = bubble.crypto.symbol.toUpperCase();
        const percentText = `${bubble.percentChange.toFixed(1)}%`;
        
        // Calculate adaptive font size based on bubble radius, text length and device
        const isMobile = window.innerWidth < 768;
        const symbolLength = symbolText.length;
        
        // Calculate base size proportional to bubble radius - maintain proportionality for larger bubbles
        let symbolFontSize = bubble.radius / 3;
        
        // More aggressive scaling for longer tokens
        if (symbolLength > 3) {
          // Use a progressive scaling formula: longer text gets more aggressive reduction
          const scaleFactor = Math.max(0.6, 4 / (symbolLength + 1));
          symbolFontSize = symbolFontSize * scaleFactor;
        }
        
        // More aggressive mobile reduction for small bubbles
        if (isMobile) {
          // Apply more reduction for small bubbles than large ones
          const mobileScaleFactor = bubble.radius < 30 ? 0.65 : (bubble.radius < 45 ? 0.75 : 0.85);
          symbolFontSize = symbolFontSize * mobileScaleFactor;
        }
        
        // Handle extremely small bubbles with long text more aggressively
        if (bubble.radius < 25 && symbolLength > 4) {
          symbolFontSize = symbolFontSize * 0.8;
        }
        
        // Dynamic minimum size based on bubble size
        const dynamicMinSize = Math.max(6, bubble.radius / 6);
        const minSymbolSize = isMobile ? dynamicMinSize : Math.max(8, dynamicMinSize);
        
        // Dynamic maximum size based on bubble size
        const dynamicMaxSize = bubble.radius / 2.5;
        
        // Apply min/max constraints
        symbolFontSize = Math.min(dynamicMaxSize, Math.max(minSymbolSize, symbolFontSize));
        
        // Apply font setting for symbol
        ctx.font = `bold ${symbolFontSize}px Arial`;
        
        // For very small bubbles with long text, consider showing only first 3-4 letters
        if (bubble.radius < 20 && symbolLength > 4 && isMobile) {
          // Show abbreviated symbol (first 3 chars + …)
          ctx.fillText(symbolText.slice(0, 3) + "…", bubble.x, bubble.y + bubble.radius * 0.05);
        } else {
          ctx.fillText(symbolText, bubble.x, bubble.y + bubble.radius * 0.05);
        }
        
        // For percentage text - size relative to symbol but with tighter bounds
        let percentFontSize = Math.min(symbolFontSize * 0.9, symbolFontSize - 1);
        
        // Ensure percentage text is not too small
        const minPercentSize = Math.max(5, minSymbolSize * 0.8);
        percentFontSize = Math.max(minPercentSize, percentFontSize);
        
        // Apply font setting for percentage
        ctx.font = `${percentFontSize}px Arial`;
        
        // Position percentage text - move closer to center for very small bubbles
        const percentYOffset = bubble.radius < 25 ? bubble.radius * 0.45 : bubble.radius * 0.55;
        ctx.fillText(percentText, bubble.x, bubble.y + percentYOffset);
      })
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle canvas click for bubble selection and repulsion
    const handleCanvasClick = (e: MouseEvent) => {
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Check if clicked on a bubble
      let clickedOnBubble = false

      for (const bubble of bubbles.current) {
        const dx = bubble.x - x
        const dy = bubble.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < bubble.radius) {
          onBubbleClick(bubble.crypto)
          clickedOnBubble = true
          break
        }
      }

      // If clicked on empty space, apply repulsion
      if (!clickedOnBubble) {
        bubbles.current.forEach((bubble) => {
          const dx = bubble.x - x
          const dy = bubble.y - y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Apply force inversely proportional to distance
          const force = 200 / Math.max(1, distance)
          const angle = Math.atan2(dy, dx)

          bubble.vx += Math.cos(angle) * force
          bubble.vy += Math.sin(angle) * force
        })
      }
    }

    canvas.addEventListener("click", handleCanvasClick)

    // Clean up
    return () => {
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("click", handleCanvasClick)
      cancelAnimationFrame(animationRef.current)
    }
  }, [cryptoData, getPercentageChange, getBubbleSize, onBubbleClick])

  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
}