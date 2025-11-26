"use client";

import { useState, useEffect, useMemo } from "react";
import { MemorySkyline } from "./MemorySkyline";
import { memoriesText } from "@/data/memories";

interface WindowConstellationProps {
  onStart: () => void;
  onTransitionComplete?: () => void;
}

export function WindowConstellation({ onStart, onTransitionComplete }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [isReversing, setIsReversing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const text = "ALONE TOGETHER";

  // Detect mobile viewport for stacked title layout
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // Tailwind sm breakpoint
    };

    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  // Memoize random positions so they don't change on re-render
  const randomPositions = useMemo(() => {
    return text.split("").map(() => ({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
    }));
  }, []);

  useEffect(() => {
    // Start title animation immediately (no delay) so it runs simultaneously with skyline
    // Use requestAnimationFrame to ensure initial render happens first
    requestAnimationFrame(() => {
      setIsAnimating(false);
    });
  }, []);

  const handleStartClick = () => {
    // Immediately hide button and trigger reverse animation
    setIsReversing(true);
    setIsAnimating(true); // Letters scatter back out
    
    // After reverse animation completes, hide component and notify parent
    setTimeout(() => {
      setIsVisible(false);
      onTransitionComplete?.();
    }, 2500); // Match the animation duration
    
    // Call onStart immediately to start globe fade-in
    onStart();
  };

  if (!isVisible) return null;

  return (
    <div className="relative w-full h-[100dvh] flex items-center justify-center overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{
          opacity: 0.6, // Adjust opacity to ensure text remains readable
        }}
      >
        <source src="/assets/video_clip_hero.mp4" type="video/mp4" />
      </video>
      
      {/* Optional dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/30 z-[1]" />
      
      <div className="absolute inset-0 flex items-center justify-center z-[2]">
        {text.split("").map((letter, index) => {
          // Random starting position (-100vw to +100vw, -100vh to +100vh)
          const randomX = randomPositions[index].x;
          const randomY = randomPositions[index].y;
          
          // Determine current state: initial scatter -> together -> reverse scatter
          const isScattered = isReversing ? true : isAnimating;

          // Centered positions
          let centeredPosition: string;
          if (isMobile) {
            const spaceIndex = text.indexOf(" ");
            const isSecondLine = index > spaceIndex;

            // Compute local index within each word (ignore the space)
            let localIndex = 0;
            let wordLength = 1;

            if (index < spaceIndex) {
              localIndex = index;
              wordLength = spaceIndex; // "ALONE"
            } else if (index > spaceIndex) {
              localIndex = index - spaceIndex - 1;
              wordLength = text.length - spaceIndex - 1; // "TOGETHER"
            }

            const xOffset = (localIndex - (wordLength - 1) / 2) * 1; // ch units
            // Move title higher on mobile so it sits clearly above the centered Start button
            const yOffset = isSecondLine ? -0.2 : -1.6;
            centeredPosition = `translate(${xOffset}ch, ${yOffset}em)`;
          } else {
            centeredPosition = `translate(${(index - (text.length - 1) / 2) * 1}ch, 0)`;
          }

          const scatteredPosition = `translate(${randomX}vw, ${randomY}vh)`;

          return (
            <span
              key={index}
              className="absolute text-5xl sm:text-6xl md:text-8xl font-bold transition-all duration-[2500ms] ease-out"
              style={{
                color: '#e5ddc7',
                transform: isScattered ? scatteredPosition : centeredPosition,
                opacity: isScattered ? 0.1 : 1,
                transitionDelay: isReversing 
                  ? `${(text.length - index) * 50}ms` // Reverse order for scatter
                  : `${index * 50}ms`,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>

      {/* Start Button - appears after animation, disappears immediately when clicked */}
      {!isReversing && (
        <button
          onClick={handleStartClick}
          className={`absolute px-8 py-3 border border-white/30 hover:bg-white/10 font-mono font-semibold transition-all duration-300 z-10 rounded ${
            isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
          }`}
          style={{ 
            transitionDelay: "3000ms",
            color: '#e5ddc7',
            // Center the button vertically, with the title sitting just above and skyline at the bottom
            top: '50%',
            left: '50%',
            transform: isAnimating ? 'translate(-50%, 2rem)' : 'translate(-50%, 0)',
          }}
        >
          Start
        </button>
      )}

      {/* Memory Skyline - appears at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 z-[3] h-64 flex items-end overflow-hidden transition-opacity duration-[2500ms] ${
        isReversing ? "opacity-0" : "opacity-100"
      }`}>
        <MemorySkyline
          memories={memoriesText}
          className="w-full"
          isAnimating={true}
        />
      </div>
    </div>
  );
}
