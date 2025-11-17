"use client";

import { useState, useEffect } from "react";

interface WindowConstellationProps {
  onStart: () => void;
}

export function WindowConstellation({ onStart }: WindowConstellationProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const text = "ALONE TOGETHER";

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Scattered Letters */}
      <div className="absolute inset-0 flex items-center justify-center">
        {text.split("").map((letter, index) => {
          // Generate random start position
          const randomX = (Math.random() - 0.5) * 200;
          const randomY = (Math.random() - 0.5) * 200;

          return (
            <span
              key={index}
              className="absolute text-6xl md:text-8xl font-bold text-white transition-all duration-[2500ms] ease-out"
              style={{
                transform: isAnimating
                  ? `translate(${randomX}vw, ${randomY}vh)`
                  : `translate(${(index - text.length / 2) * 0.875}ch, 0)`,
                opacity: isAnimating ? 0.1 : 1,
                transitionDelay: `${index * 50}ms`,
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </span>
          );
        })}
      </div>

      {/* Start Button - appears after animation */}
      <button
        onClick={onStart}
        className={`absolute bottom-32 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-1000 shadow-lg ${
          isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
        }`}
        style={{ transitionDelay: "2500ms" }}
      >
        Start Exploring
      </button>
    </div>
  );
}

