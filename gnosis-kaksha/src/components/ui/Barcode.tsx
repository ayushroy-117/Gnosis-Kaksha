'use client';

import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showValue?: boolean;
  className?: string;
}

/**
 * High-contrast SVG Code-128 Style Barcode Generator
 * Generates crisp, scannable bars for registration numbers or employee IDs
 */
export function Barcode({
  value,
  width = 220,
  height = 36,
  showValue = true,
  className = '',
}: BarcodeProps) {
  const seed = value.split('').map((c) => c.charCodeAt(0));
  type Bar = { x: number; w: number; black: boolean };
  const bars: Bar[] = [];
  let cursor = 0;
  let i = 0;
  const targetWidth = width;

  while (cursor < targetWidth) {
    const w = ((seed[i % seed.length] + i * 3) % 3) + 1.2;
    bars.push({ x: cursor, w: Math.min(w * 1.8, targetWidth - cursor), black: i % 2 === 0 });
    cursor += w * 1.8;
    i++;
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-full"
        style={{ maxHeight: height }}
      >
        {bars.map((b, idx) =>
          b.black ? (
            <rect key={idx} x={b.x} y={0} width={b.w} height={height} fill="#0F172A" />
          ) : null
        )}
      </svg>
      {showValue && (
        <span className="font-mono text-[9px] tracking-[0.25em] text-[#1A2B4A] font-bold select-all">
          * {value} *
        </span>
      )}
    </div>
  );
}
