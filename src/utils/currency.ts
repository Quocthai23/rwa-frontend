// export function formatPriceDecimal2(price: number): string {
//   // const absPrice = Math.abs(price);
//   // let decimals;

//   // if (absPrice >= 1000) {
//   //   decimals = 2; // 1234.56 = 6 digits
//   // } else if (absPrice >= 100) {
//   //   decimals = 3; // 123.456 = 6 digits
//   // } else if (absPrice >= 10) {
//   //   decimals = 4; // 12.3456 = 6 digits
//   // } else if (absPrice >= 1) {
//   //   decimals = 5; // 1.23456 = 6 digits
//   // } else {
//   //   decimals = 5; // 0.12345 = 6 digits (leading 0 not counted)
//   // }

//   // return price?.toLocaleString('en-US', {
//   //   minimumFractionDigits: decimals,
//   //   maximumFractionDigits: decimals,
//   // });

//   if (!Number.isFinite(price)) return '0';

//   const abs = Math.abs(price);
//   const decimals = abs >= 1000 ? 2 : abs >= 100 ? 3 : abs >= 10 ? 4 : 5;

//   const [index, d = ''] = String(price).split('.');

//   return d
//     ? `${index}.${d.slice(0, decimals).padEnd(decimals, '0')}`
//     : `${index}.${'0'.repeat(decimals)}`;
// }

export const formatBalance = (value: number | string): string => {
  const number_ = typeof value === 'string' ? Number.parseFloat(value) : value;

  return number_.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

const truncateDecimal = (value: number, max: number) => {
  const factor = Math.pow(10, max);

  return Math.trunc(value * factor) / factor;
};
export const formatPriceDecimal = (price: number, min = 2, max = 5) => {
  const truncated = truncateDecimal(price, max);

  return truncated.toLocaleString('en-US', {
    maximumFractionDigits: max,
    minimumFractionDigits: min,
  });
};

export const formatQuantity = (value: number | string, decimals = 2) => {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

