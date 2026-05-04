export type StrategyPageType = 'ALL' | 'Commodities' | 'FX' | 'Indices' | 'US-SHARE' | string;

export type StrategyResultItem = {
  id: number;
  symbol: string;
  symbolName: string;
  symbolType: string;
  title: string;
  description: string;
  darkImage: string;
  image: string;
  link: string;
  period: string;
  time: number;
  direction: string;
  preference: string;
  technology: string;
  alternative: string;
};

export type StrategyPageResponse = {
  success: boolean;
  message: string;
  value: {
    currentPage: number;
    total: number;
    pageSize: number;
    resultList: StrategyResultItem[];
  };
};

export type GetStrategyPageRequest = {
  page?: number;
  size?: number;
  type?: StrategyPageType;
  locale?: string;
  symbols?: string;
};
