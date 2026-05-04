export type Account = {
  accountTypeId: string;
  availableBalance: string;
  balance: string;
  createdAt: string;
  currency?: string; // Optional as it might come from account type or be joined
  id: string;
  lockedBalance: string;
  name: string;
  updatedAt: string;
};

export type AccountType = {
  code: string;
  createdAt: string;
  currency: string;
  description: string;
  id: string;
  isActive: boolean;
  name: string;
  updatedAt: string;
};

export type AccountTypesResponse = {
  accountTypes: AccountType[];
};

export type CreateAccountRequest = {
  accountTypeId: string;
  name: string;
};
