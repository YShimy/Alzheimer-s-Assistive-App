import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle, G } from 'react-native-svg';

interface MemoCarLogoProps {
  size?: number;
}

/**
 * MemoCare app logo — a stylised brain-heart motif rendered as an inline SVG.
 *
 * The mark combines a softly curved brain outline (right hemisphere) flowing
 * into a protective palm/heart arc on the left, symbolising cognitive support
 * and compassionate care.  Colours use the Serene Interface palette:
 *
 *   Primary teal   #3d6476
 *   Light sky blue  #bae3f8
 *   Warm accent     #acd5ea
 *
 * Designed to sit inside the 80 × 80 logo circle on the Login screen.
 */
export function MemoCareLogo({ size = 56 }: MemoCarLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        {/* Gradient for the brain-heart mark */}
        <LinearGradient id="brandGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#bae3f8" />
          <Stop offset="50%" stopColor="#acd5ea" />
          <Stop offset="100%" stopColor="#3d6476" />
        </LinearGradient>

        {/* Subtle glow behind the mark */}
        <LinearGradient id="glowGrad" x1="60" y1="20" x2="60" y2="110" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#bae3f8" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#3d6476" stopOpacity="0.10" />
        </LinearGradient>
      </Defs>

      {/* Soft background glow circle */}
      <Circle cx="60" cy="60" r="54" fill="url(#glowGrad)" />

      <G>
        {/* Brain — right hemisphere stylisation (two nested sulci curves) */}
        <Path
          d="M62 26
             C74 26, 84 32, 90 42
             C96 52, 96 66, 90 76
             C84 88, 72 92, 62 92"
          stroke="url(#brandGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner sulcus detail — upper */}
        <Path
          d="M68 38
             C78 40, 84 48, 82 58"
          stroke="#3d6476"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        {/* Inner sulcus detail — lower */}
        <Path
          d="M70 62
             C80 64, 82 74, 74 82"
          stroke="#3d6476"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Corpus-callosum midline (vertical link between hemispheres) */}
        <Path
          d="M62 30 L62 88"
          stroke="#3d6476"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.4"
        />

        {/* Left side — protective hand / heart arc */}
        <Path
          d="M58 26
             C46 26, 34 34, 30 46
             C26 58, 30 72, 38 82
             C44 88, 52 92, 58 92"
          stroke="url(#brandGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Heart accent at the core — small, warm */}
        <Path
          d="M54 52
             C54 48, 50 46, 48 48
             C46 50, 46 52, 48 55
             L54 62
             L60 55
             C62 52, 62 50, 60 48
             C58 46, 54 48, 54 52Z"
          fill="#3d6476"
          opacity="0.85"
        />

        {/* Tiny pulse dot — top of brain */}
        <Circle cx="62" cy="26" r="3" fill="#3d6476" />
        <Circle cx="58" cy="26" r="3" fill="#acd5ea" />
      </G>
    </Svg>
  );
}
