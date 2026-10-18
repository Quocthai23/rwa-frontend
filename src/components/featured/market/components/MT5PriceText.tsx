'use client';

import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { DecimalValue } from '@/types/decimal';

type Props = {
  readonly baseFontSize?: number;

  readonly baseStyle?: CSSProperties;

  readonly bigFontSize?: number;

  readonly bigStyle?: CSSProperties;

  readonly containerStyle?: CSSProperties;

  readonly fixedDecimals?: number;
  readonly digit?: number;

  readonly style?: CSSProperties;

  readonly supFontSize?: number;

  readonly supStyle?: CSSProperties;

  readonly useGrouping?: boolean;

  readonly value: DecimalValue;
};

function extractColor(style?: CSSProperties | CSSProperties[]) {
  if (!style) return undefined;

  if (Array.isArray(style)) {
    for (let index = style.length - 1; index >= 0; index--) {
      const s = style[index] as null | CSSProperties | undefined;
      if (s?.color) return s.color;
    }

    return undefined;
  }

  return style?.color;
}

function formatGrouping(intPart: string, useGrouping: boolean) {
  if (!useGrouping) return intPart;

  return intPart.replaceAll(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const tabularFigures: CSSProperties = {
  fontFeatureSettings: '"tnum"',
  fontVariantNumeric: 'tabular-nums',
};

function parseParts(value: DecimalValue, fixedDecimals?: number) {
  const raw = typeof value === 'number' ? String(value) : String(value).trim();

  const sign = raw.startsWith('-') ? '-' : '';
  const unsigned = sign ? raw.slice(1) : raw;

  if (fixedDecimals != null) {
    const n = typeof value === 'number' ? value : Number(unsigned.replaceAll(',', ''));

    if (!Number.isFinite(n)) {
      return { decPart: '', intPart: unsigned, sign };
    }

    const s = Math.abs(n).toFixed(fixedDecimals);
    const [index, d = ''] = s.split('.');

    return { decPart: d, intPart: index, sign };
  }

  const cleaned = unsigned.replaceAll(',', '');
  let [index = '0', d = ''] = cleaned.split('.');

  if (!d) {
    d = '00';
  } else if (d.length === 1) {
    d = d + '0';
  }

  return { decPart: d, intPart: index || '0', sign };
}

const MT5PriceText = memo(function MT5PriceText({
  baseFontSize,
  baseStyle,
  bigFontSize,
  bigStyle,
  containerStyle,
  digit,
  fixedDecimals,
  style,
  supFontSize,
  supStyle,
  useGrouping = false,
  value,
}: Props) {
  const inheritedColor = extractColor(style);
  const resolvedDecimals =
    fixedDecimals != null
      ? Math.max(0, Math.floor(fixedDecimals))
      : digit != null
        ? Math.max(0, Math.floor(digit))
        : undefined;

  const parts = useMemo(() => {
    const { decPart, intPart, sign } = parseParts(value, resolvedDecimals);

    const dec = decPart.length > 5 ? decPart.slice(0, 5) : decPart;

    const intFmt = formatGrouping(intPart, useGrouping);
    const decLength = dec.length;

    if (decLength >= 3) {
      const normalLength = Math.max(0, decLength - 3);
      const normal = dec.slice(0, normalLength);
      const big = dec.slice(normalLength, normalLength + 2);
      const sup = dec.slice(normalLength + 2, normalLength + 3);

      return { big, hasDot: true, intFmt, normal, sign, sup };
    }

    if (decLength === 2) {
      return { big: dec, hasDot: true, intFmt, normal: '', sign, sup: '' };
    }

    return {
      big: '',
      hasDot: decLength > 0,
      intFmt,
      normal: dec,
      sign,
      sup: '',
    };
  }, [value, resolvedDecimals, useGrouping]);

  return (
    <div
      style={{
        alignItems: 'flex-start',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
        ...tabularFigures,
        ...containerStyle,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontSize: baseFontSize ?? 16,
          fontWeight: 600,
          lineHeight: '20px',
          ...tabularFigures,
          ...baseStyle,
          ...style,
        }}
      >
        {parts.sign}
        {parts.intFmt}
        {parts.hasDot ? '.' : ''}
        {parts.normal}
      </span>

      {!!parts.big && (
        <span
          style={{
            boxSizing: 'content-box',
            color: inheritedColor,
            display: 'inline-block',
            flexShrink: 0,
            fontSize: bigFontSize ?? 20,
            fontWeight: 700,
            lineHeight: '20px',
            minWidth: `${parts.big.length}ch`,
            textAlign: 'center',
            transform: 'translateY(-1px)',
            ...tabularFigures,
            ...bigStyle,
          }}
        >
          {parts.big}
        </span>
      )}

      {!!parts.sup && (
        <span
          style={{
            boxSizing: 'content-box',
            color: inheritedColor,
            display: 'inline-block',
            flexShrink: 0,
            fontSize: supFontSize ?? 16,
            fontWeight: 700,
            lineHeight: '20px',
            marginLeft: 1,
            minWidth: `${parts.sup.length}ch`,
            textAlign: 'center',
            transform: 'translateY(-6px)',
            ...tabularFigures,
            ...supStyle,
          }}
        >
          {parts.sup}
        </span>
      )}
    </div>
  );
});

export default MT5PriceText;

