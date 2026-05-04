import { type TimeFrame } from '../types/types';

export const getTimeframeInMs = (timeframe: TimeFrame): number => {
  const map: Record<TimeFrame, number> = {
    '10m': 600_000, // 10 minutes = 600 seconds = 600000ms
    '12h': 43_200_000, // 12 hours = 43200 seconds
    '12m': 720_000, // 12 minutes = 720 seconds = 720000ms
    '15m': 900_000, // 15 minutes = 900 seconds = 900000ms
    '1d': 86_400_000, // 1 day = 86400 seconds
    '1h': 3_600_000, // 1 hour = 3600 seconds
    '1m': 60_000, // 1 minute = 60 seconds = 60000ms
    '1M': 2_592_000_000, // 1 month (30 days) = 2592000 seconds
    '1w': 604_800_000, // 1 week = 604800 seconds
    '20m': 1_200_000, // 20 minutes = 1200 seconds = 1200000ms
    '2h': 7_200_000, // 2 hours = 7200 seconds
    '2m': 120_000, // 2 minutes = 120 seconds = 120000ms
    '30m': 1_800_000, // 30 minutes = 1800 seconds
    '3h': 10_800_000, // 3 hours = 10800 seconds
    '3m': 180_000, // 3 minutes = 180 seconds = 180000ms
    '4h': 14_400_000, // 4 hours = 14400 seconds
    '4m': 240_000, // 4 minutes = 240 seconds = 240000ms
    '5m': 300_000, // 5 minutes = 300 seconds = 300000ms
    '6h': 21_600_000, // 6 hours = 21600 seconds
    '6m': 360_000, // 6 minutes = 360 seconds = 360000ms
    '8h': 28_800_000, // 8 hours = 28800 seconds
  };

  return map[timeframe];
};

export const timeFrameLabels: Record<number, string> = {
  10_800: 'H3',
  120: 'M2',
  1200: 'M20',
  14_400: 'H4',
  180: 'M3',
  1800: 'M30',
  21_600: 'H6',
  240: 'M4',
  2_592_000: 'MN',
  28_800: 'H8',
  300: 'M5',
  360: 'M6',
  3600: 'H1',
  43_200: 'H12',
  60: 'M1',
  600: 'M10',
  604_800: 'W1',
  720: 'M12',
  7200: 'H2',
  86_400: 'D1',
  900: 'M15',
};

export function parseDecimal(text: string) {
  const n = Number(text);

  return Number.isFinite(n) ? n : Number.NaN;
}

export function sanitizeDecimalInput(input: string) {
  let s = input.replaceAll(/[^\d,.]/g, '');

  const firstDot = s.indexOf('.');
  const firstComma = s.indexOf(',');
  const decIndex =
    firstDot === -1 ? firstComma : firstComma === -1 ? firstDot : Math.min(firstDot, firstComma);

  if (decIndex === -1) {
    s = s.replaceAll(/[,.]/g, '');
  } else {
    const decChar = s[decIndex];

    s = s.slice(0, decIndex + 1) + s.slice(decIndex + 1).replaceAll(/[,.]/g, '');

    if (decChar === ',') s = s.replace(',', '.');
  }

  return s;
}

export const timeRanges = [
  {
    lable: 'M1',
    value: 60,
  },
  {
    lable: 'M5',
    value: 300,
  },
  {
    lable: 'M15',
    value: 900,
  },
  {
    lable: 'M30',
    value: 1800,
  },
  {
    lable: 'H1',
    value: 3600,
  },
  {
    lable: 'H4',
    value: 14_400,
  },
  {
    lable: 'D1',
    value: 86_400,
  },
  {
    lable: 'W1',
    value: 604_800,
  },
];

export const timeframeGroups = {
  day: {
    items: [
      { lable: 'D1', value: 86_400 },
      { lable: 'W1', value: 604_800 },
      { lable: 'MN', value: 2_592_000 },
    ],
    label: 'Day',
  },
  hour: {
    items: [
      { lable: 'H1', value: 3600 },
      { lable: 'H2', value: 7200 },
      { lable: 'H4', value: 14_400 },
      { lable: 'H6', value: 21_600 },
      { lable: 'H8', value: 28_800 },
      { lable: 'H12', value: 43_200 },
    ],
    label: 'Hour',
  },
  minute: {
    items: [
      { lable: 'M1', value: 60 },
      { lable: 'M5', value: 300 },
      { lable: 'M15', value: 900 },
      { lable: 'M30', value: 1800 },
    ],
    label: 'Minute',
  },
};
