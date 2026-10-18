type PublicIdentity = {
  id?: string | null;
};

export function getGuestNumber(identity: PublicIdentity | string | null | undefined): number {
  const source = typeof identity === 'string' ? identity : identity?.id;
  if (!source) return 1000;

  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return 1000 + ((hash >>> 0) % 9000);
}
