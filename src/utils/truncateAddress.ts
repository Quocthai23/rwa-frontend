export function truncateAddress(
  addr: string,
  options?: { headChars?: number; tailChars?: number; minLength?: number },
): string {
  const { headChars = 8, tailChars = 6, minLength = 12 } = options ?? {};

  if (!addr || addr.length < minLength) return addr;
  return `${addr.slice(0, headChars)}...${addr.slice(-tailChars)}`;
}

