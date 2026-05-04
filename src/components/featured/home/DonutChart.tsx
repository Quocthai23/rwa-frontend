'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Segment = { value: number; color: string };
type RingPath = { key: string; color: string; d: string };

type Props = {
  segments: Segment[];
  valueText: string;
  unitText?: string;
  size?: number;
  thickness?: number;
  gapDeg?: number;
  backgroundColor?: string;
  drawDurationMs?: number;
  slideDurationMs?: number;
};

const TAU = Math.PI * 2;

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function segmentPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  a0: number,
  a1: number,
  capRadius: number,
) {
  const p0o = polar(cx, cy, rOuter, a0);
  const p1o = polar(cx, cy, rOuter, a1);
  const p1i = polar(cx, cy, rInner, a1);
  const p0i = polar(cx, cy, rInner, a0);

  const sweep = a1 - a0;
  const largeArc = sweep > Math.PI ? 1 : 0;

  return [
    `M ${p0o.x} ${p0o.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p1o.x} ${p1o.y}`,
    `A ${capRadius} ${capRadius} 0 0 1 ${p1i.x} ${p1i.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p0i.x} ${p0i.y}`,
    `A ${capRadius} ${capRadius} 0 0 1 ${p0o.x} ${p0o.y}`,
    'Z',
  ].join(' ');
}

function buildPaths(
  segments: Segment[],
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  capRadius: number,
  gapDeg: number,
): RingPath[] {
  const clean = segments.filter((s) => s.value > 0);
  const total = clean.reduce((s, a) => s + a.value, 0) || 1;

  const gap = (gapDeg * Math.PI) / 180;
  const start = -Math.PI / 2;

  let acc = 0;

  return clean.map((seg, i) => {
    const sweep = (seg.value / total) * TAU;

    const segStart = start + acc;
    const segEnd = segStart + sweep;

    acc += sweep;

    const a0 = segStart + gap / 2;
    const a1 = segEnd - gap / 2;

    return {
      key: String(i),
      color: seg.color,
      d: segmentPath(cx, cy, rOuter, rInner, a0, a1, capRadius),
    };
  });
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function DonutChart({
  segments,
  valueText,
  unitText = 'Lots',
  size = 320,
  thickness = 44,
  gapDeg = 6,
  backgroundColor = '#F3F4F6',
  slideDurationMs = 400,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;

  const rOuter = size * 0.46;
  const rInner = rOuter - thickness;

  const capRadius = Math.max(thickness * 0.9, thickness / 2 + 1);

  const [animSegments, setAnimSegments] = useState(segments);

  const startRef = useRef<number>(0);
  const fromRef = useRef<Segment[]>(segments);
  const toRef = useRef<Segment[]>(segments);

  useEffect(() => {
    fromRef.current = animSegments;
    toRef.current = segments;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const tRaw = Math.min(1, (now - startRef.current) / slideDurationMs);
      const t = easeOutCubic(tRaw);

      const next = segments.map((segTo, i) => {
        const segFrom = fromRef.current[i] ?? { value: 0, color: segTo.color };

        return {
          color: segTo.color,
          value: segFrom.value + (segTo.value - segFrom.value) * t,
        };
      });

      setAnimSegments(next);

      if (tRaw < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [segments]);

  const paths = useMemo(() => {
    return buildPaths(animSegments, cx, cy, rOuter, rInner, capRadius, gapDeg);
  }, [animSegments, cx, cy, rOuter, rInner, capRadius, gapDeg]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        backgroundColor,
        position: 'relative',
      }}
    >
      <svg width={size} height={size}>
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill={p.color} />
        ))}
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="text-body-large-semibold text-foreground">{valueText}</div>
        <div className="text-caption-medium text-muted-foreground">{unitText}</div>
      </div>
    </div>
  );
}
