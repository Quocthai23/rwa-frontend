import type { TFunction } from 'i18next';
import { describe, expect, it, vi } from 'vitest';

import { localizeApiError } from './apiErrors';

const translations: Record<string, string> = {
  'apiErrors.generic': 'Đã xảy ra lỗi',
  'apiErrors.unauthorized': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'trade.errors.failedCreateOrder': 'Không thể tạo lệnh. Vui lòng thử lại.',
  'trade.errors.insufficientAvailableBalance': 'Số dư khả dụng không đủ.',
  'trade.errors.maxOrderValueExceeded': 'Giá trị tối đa mỗi lệnh là {{value}} VNDT.',
  'trade.buyoutTrading.buyerLockedShort':
    'Người thâu tóm không thể đặt lệnh khi chương trình đang hoạt động.',
};

const t = vi.fn((key: string, options?: Record<string, unknown>) =>
  (translations[key] ?? key).replace('{{value}}', String(options?.value ?? '')),
) as unknown as TFunction;

describe('localizeApiError', () => {
  it('localizes session-expired codes', () => {
    expect(localizeApiError({ code: 'session-expired', message: 'Session expired' }, t)).toBe(
      translations['apiErrors.unauthorized'],
    );
  });

  it('localizes nested insufficient-balance messages', () => {
    expect(localizeApiError({ errors: { message: 'Insufficient available balance' } }, t)).toBe(
      translations['trade.errors.insufficientAvailableBalance'],
    );
  });

  it('does not expose unknown backend messages', () => {
    expect(localizeApiError({ message: 'Database driver exploded' }, t)).toBe(
      translations['apiErrors.generic'],
    );
  });

  it('localizes the maximum order value and keeps its configured amount', () => {
    expect(localizeApiError({ message: 'Order value must not exceed 2000000000 VNDT' }, t)).toBe(
      'Giá trị tối đa mỗi lệnh là 2.000.000.000 VNDT.',
    );
  });

  it('localizes the acquirer trading lock without exposing a backend code', () => {
    expect(
      localizeApiError(
        {
          code: 'bad-request',
          message: 'buyout-buyer-cannot-trade-until-program-is-completed',
        },
        t,
      ),
    ).toBe(translations['trade.buyoutTrading.buyerLockedShort']);
  });
});
