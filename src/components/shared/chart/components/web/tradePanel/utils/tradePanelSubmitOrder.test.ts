import { describe, expect, it, vi } from 'vitest';

import { ORDER_SIDES } from '@/types/orders';

import {
  submitTradePanelOrder,
  type SubmitTradePanelOrderParams,
} from './tradePanelSubmitOrder';

function createParams(
  overrides: Partial<SubmitTradePanelOrderParams> = {},
): SubmitTradePanelOrderParams {
  return {
    user: { id: 'user-1' },
    router: { push: vi.fn() },
    canTrade: true,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    t: ((key: string) => key) as SubmitTradePanelOrderParams['t'],
    symbolAsset: {
      id: 'asset-1',
      symbol: 'RWA1',
      referencePrice: '100',
      priceBandPercentage: '0.1',
    } as SubmitTradePanelOrderParams['symbolAsset'],
    isCreatingOrder: false,
    submitLockRef: { current: false },
    quantity: '1',
    volumeStepNum: 0.01,
    minTradeSize: 0.01,
    maxTradeSize: 1000,
    setQuantity: vi.fn(),
    activeTab: 'Market',
    transactionType: 'buy',
    symbol: 'RWA1',
    sellPrice: 99,
    buyPrice: 100,
    quoteAvailableBalance: 1000,
    baseAvailableQuantity: 10,
    accountId: 'account-1',
    limitPrice: '',
    createOrder: vi.fn(),
    refetchOrders: vi.fn(),
    tradePanelRef: { current: null },
    setIsSubmitLocked: vi.fn(),
    ...overrides,
  };
}

describe('submitTradePanelOrder spot rules', () => {
  it('submits MARKET BUY with idempotency and a protected maximum cost', () => {
    const params = createParams();

    submitTradePanelOrder(ORDER_SIDES.BUY, params);

    expect(params.createOrder).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(params.createOrder).mock.calls[0][0];
    expect(payload).toMatchObject({
      accountId: 'account-1',
      assetId: 'asset-1',
      maxTotalCost: '101',
      quantity: '1',
      side: 'BUY',
      type: 'MARKET',
    });
    expect(payload.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(payload).not.toHaveProperty('symbol');
  });

  it('rejects a MARKET BUY whose protected value exceeds the asset limit', () => {
    const params = createParams({
      symbolAsset: {
        id: 'asset-1',
        symbol: 'RWA1',
        referencePrice: '100',
        priceBandPercentage: '0.1',
        maxOrderValue: '100',
      } as SubmitTradePanelOrderParams['symbolAsset'],
    });

    submitTradePanelOrder(ORDER_SIDES.BUY, params);

    expect(params.createOrder).not.toHaveBeenCalled();
    expect(params.showError).toHaveBeenCalledWith(
      'trade.errors.tradeFailedTitle',
      'trade.errors.maxOrderValueExceeded',
    );
  });

  it('rejects SELL when available token quantity is insufficient', () => {
    const params = createParams({
      transactionType: 'sell',
      baseAvailableQuantity: 0.5,
    });

    submitTradePanelOrder(ORDER_SIDES.SELL, params);

    expect(params.createOrder).not.toHaveBeenCalled();
    expect(params.showError).toHaveBeenCalledWith(
      'trade.errors.tradeFailedTitle',
      'trade.errors.insufficientAssetBalance',
    );
  });

  it('allows a marketable LIMIT BUY to cross the best ask', () => {
    const params = createParams({
      activeTab: 'Limit',
      limitPrice: '101',
      buyPrice: 100,
    });

    submitTradePanelOrder(ORDER_SIDES.BUY, params);

    expect(params.createOrder).toHaveBeenCalledTimes(1);
    expect(vi.mocked(params.createOrder).mock.calls[0][0]).toMatchObject({
      price: '101',
      side: 'BUY',
      type: 'LIMIT',
    });
  });
});
