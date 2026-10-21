export const isDemoAccount = (account: { accountTypeId?: string } | null | undefined) =>
  Boolean(account?.accountTypeId?.toLowerCase().includes('demo'));
