'use client';

import React, { useMemo } from 'react';
import { code128B } from '@/lib/code128';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showValue?: boolean;
  className?: string;
}

/**
 * Real, scannable Code 128 barcode (SVG). A USB/Bluetooth barcode scanner
 * reads it as keyboard input: the value, then Enter (see /scan).
 */
export function Barcode({ value, width = 220, height = 36, showValue = true, className = '' }: BarcodeProps) {
  const { rects, modules } = useMemo(() => {
    const widths = code128B(value);
    const total = widths.reduce((a, b) => a + b, 0);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    widths.forEach((w, i) => {
      if (i % 2 === 0) out.push({ x, w });
      x += w;
    });
    return { rects: out, modules: total };
  }, [value]);
  // 10-module quiet zone each side, as the spec requires for reliable scans.
  const quiet = 10;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <svg
        viewBox={`0 0 ${modules + quiet * 2} 1`}
        preserveAspectRatio="none"
        width={width}
        height={height}
        role="img"
        aria-label={`Barcode ${value}`}
        shapeRendering="crispEdges"
        className="max-w-full"
      >
        <rect x={0} y={0} width={modules + quiet * 2} height={1} fill="#fff" />
        {rects.map((r, i) => (
          <rect key={i} x={r.x + quiet} y={0} width={r.w} height={1} fill="#000" />
        ))}
      </svg>
      {showValue && (
        <span className="font-mono text-[9px] tracking-[0.2em] text-[#1A2B4A] font-bold select-all">{value}</span>
      )}
    </div>
  );
}
