"use client";

import React, { ReactNode } from "react";

interface CurvedHeaderProps {
  children?: ReactNode;
  height?: string;
  className?: string;
}

export function CurvedHeader({ children, height = "240px", className = "" }: CurvedHeaderProps) {
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Yellow Background with SVG curve */}
      <div 
        className="absolute top-0 left-0 w-full bg-primary"
        style={{ height: height }}
      >
        {/* SVG Curve at the bottom */}
        <svg 
          className="absolute bottom-0 w-full h-[50px] translate-y-[99%]" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,0 C50,100 100,0 100,0 L100,-100 L0,-100 Z" 
            fill="var(--primary)" 
          />
        </svg>
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 pt-12 pb-[60px] px-6">
        {children}
      </div>
    </div>
  );
}
