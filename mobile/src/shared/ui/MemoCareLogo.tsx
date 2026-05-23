import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

interface MemoCareLogoProps {
  size?: number;
}

/**
 * MemoCare app logo — A modern, elegant geometric design.
 * 
 * Concept: Two overlapping circles representing "Connection", "Memory", and "Care".
 * The intersection forms a subtle leaf/spark shape, symbolising clarity, growth, and 
 * cognitive vitality. The clean, minimalist aesthetic provides a premium, 
 * trustworthy feel.
 */
export function MemoCareLogo({ size = 56 }: MemoCareLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <LinearGradient id="leftCircle" x1="16" y1="16" x2="80" y2="104" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#3d6476" />
          <Stop offset="100%" stopColor="#5c8a9e" />
        </LinearGradient>
        <LinearGradient id="rightCircle" x1="104" y1="16" x2="40" y2="104" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#bae3f8" />
          <Stop offset="100%" stopColor="#75abc2" />
        </LinearGradient>
        <LinearGradient id="leafGrad" x1="60" y1="30" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#f0f8fc" stopOpacity="0.8" />
        </LinearGradient>
      </Defs>

      {/* Left Circle - Deep Teal (Care & Stability) */}
      <Circle cx="46" cy="60" r="34" fill="url(#leftCircle)" opacity="0.95" />
      
      {/* Right Circle - Light Blue (Clarity & Future) */}
      <Circle cx="74" cy="60" r="34" fill="url(#rightCircle)" opacity="0.9" />
      
      {/* Center Intersection (Clarity/Memory spark) */}
      <Path 
        d="M 60 29 A 34 34 0 0 1 60 91 A 34 34 0 0 1 60 29 Z" 
        fill="url(#leafGrad)" 
      />

      {/* Inner accent stroke for the leaf to give it a premium embossed look */}
      <Path 
        d="M 60 29 A 34 34 0 0 1 60 91 A 34 34 0 0 1 60 29 Z" 
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.6"
      />

      {/* Floating particles representing memories/synapses */}
      <Circle cx="88" cy="28" r="4" fill="#3d6476" opacity="0.6" />
      <Circle cx="26" cy="85" r="5" fill="#bae3f8" opacity="0.9" />
      <Circle cx="22" cy="38" r="3" fill="#75abc2" opacity="0.7" />
    </Svg>
  );
}
