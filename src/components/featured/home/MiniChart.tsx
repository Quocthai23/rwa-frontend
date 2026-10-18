import React, { useId } from 'react';
import { useTheme } from '@/theme';

import type { Candle } from '@/services/marketService';

type MiniChartProps = {
  candles: Candle[];
  height?: number;
  isPositive?: boolean;
  responsive?: boolean;
  strokeWidth?: number;
  width?: number;
};

const MiniChart = ({
  candles,
  height = 37.5,
  isPositive = false,
  responsive = false,
  strokeWidth = 0.42,
  width = 75,
}: MiniChartProps) => {
  const { colors } = useTheme();
  const uniqueId = useId();
  const chartContainerStyle = responsive
    ? {
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
      }
    : { height, width };

  if (!candles || candles.length === 0) {
    return <div style={chartContainerStyle} />;
  }

  const prices = candles.map((c) => c.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) {
    return <div style={chartContainerStyle} />;
  }

  const points = candles.map((candle, index) => {
    const x = (index / (candles.length - 1)) * width;
    const normalizedPrice = (candle.close - minPrice) / priceRange;
    const y = height - normalizedPrice * height;

    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = isPositive ? colors.green500 : colors.red500;
  const gradientId = `chart-gradient-${uniqueId}`;

  return (
    <div style={chartContainerStyle}>
      <svg
        width={responsive ? '100%' : width}
        height={responsive ? '100%' : height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="93%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      </svg>
    </div>
  );
};

export default MiniChart;

