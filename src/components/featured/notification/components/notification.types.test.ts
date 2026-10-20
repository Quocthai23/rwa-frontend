import { describe, it, expect, vi } from 'vitest';
vi.mock('@/i18n', () => ({ default: { language: 'vi', resolvedLanguage: 'vi' } }));
vi.mock('@/utils/dateUtils', () => ({ formatTimeAgo: () => 'now' }));
import { mapApiNotificationToItem } from './notification.types';
import type { NotificationItem } from '@/types/notification';
const base = {
  id: 'notice',
  type: 'KYC_APPROVED',
  title: 'Identity approved',
  content: 'Your verification is complete',
  isRead: false,
  createdAt: '2026-10-20T00:00:00Z',
} as NotificationItem;
describe('backend notification contract', () => {
  it('formats token transfers without labeling them as VND and retains action state', () => {
    const item = mapApiNotificationToItem({
      ...base,
      category: 'finance',
      requiresAction: true,
      metadata: {
        category: 'finance',
        values: { amount: '12.5', currency: 'TEST-TOKEN' },
        descriptionKey: 'notifications.events.TRANSFER_SENT.body',
      },
    });
    expect(item.category).toBe('finance');
    expect(item.requiresAction).toBe(true);
    expect(item.description.values?.amount).toBe('12,5');
    expect(item.description.values?.currency).toBe('TEST-TOKEN');
    expect(String(item.description.values?.amount)).not.toContain('VND');
  });

  it('keeps string event titles and content instead of showing a generic social notification', () => {
    const item = mapApiNotificationToItem(base);
    expect(item.title.values?.message).toBe(base.title);
    expect(item.description.values?.message).toBe(base.content);
    expect(item.category).toBe('system');
  });
  it('localizes an actionable amount and opens the matching property tab', () => {
    const item = mapApiNotificationToItem({
      ...base,
      type: 'RENT_CLAIM_AVAILABLE',
      metadata: JSON.stringify({
        category: 'trading',
        titleKey: 'notifications.actions.RENT_CLAIM_AVAILABLE.title',
        descriptionKey: 'notifications.actions.RENT_CLAIM_AVAILABLE.description',
        values: { asset: 'Riverside', amount: '15000000' },
        targetUrl: '/asset-management/asset/rental',
      }),
    });
    expect(item.title.key).toBe('notifications.actions.RENT_CLAIM_AVAILABLE.title');
    expect(item.description.values?.amount).toContain('15.000.000');
    expect(item.category).toBe('trading');
    expect(item.targetUrl).toBe('/asset-management/asset/rental');
  });
  it('rejects external and protocol-relative notification destinations', () => {
    for (const targetUrl of [
      'https://example.com',
      '//example.com',
      '/' + String.fromCharCode(92) + 'example.com',
    ])
      expect(
        mapApiNotificationToItem({ ...base, metadata: { targetUrl } }).targetUrl,
      ).toBeUndefined();
  });
});
