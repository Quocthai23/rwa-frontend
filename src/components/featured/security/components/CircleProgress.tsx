'use client';

import { useTheme } from '@/theme';

const RING_SIZE = 64;
const STROKE_WIDTH = 5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircleProgress({ max, value }: { readonly max: number; readonly value: number }) {
  const { colors } = useTheme();
  const progress = value / max;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90 transform">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.neutral200 || '#E5E5E5'}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={colors.primary500 || '#3B82F6'}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute flex items-center justify-center">
        <span className="text-h4-bold text-foreground font-bold">
          {value}/{max}
        </span>
      </div>
    </div>
  );
}
