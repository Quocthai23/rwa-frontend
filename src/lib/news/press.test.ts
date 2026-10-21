import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizePressItem, getPressNews } from './press';
const feed = { source: 'VnExpress', topic: 'Bất động sản', url: '', host: 'vnexpress.net' };
afterEach(() => vi.unstubAllGlobals());
describe('press RSS', () => {
  it('rejects unsafe links, spoofed domains and invalid dates', () => {
    for (const link of ['javascript:alert(1)', 'https://vnexpress.net.evil.test/a'])
      expect(normalizePressItem({ title: 'Title', link, isoDate: '2026-10-20' }, feed)).toBeNull();
    expect(
      normalizePressItem(
        { title: 'Title', link: 'https://vnexpress.net/a', isoDate: 'invalid' },
        feed,
      ),
    ).toBeNull();
  });
  it('keeps attribution and plain text without importing article content', () => {
    const item = normalizePressItem(
      { title: '<b>Title</b>', link: 'https://vnexpress.net/a', isoDate: '2026-10-20' },
      feed,
    );
    expect(item).toMatchObject({ title: 'Title', source: 'VnExpress', topic: 'Bất động sản' });
    expect(item).not.toHaveProperty('content');
  });
  it('deduplicates articles and tolerates an unavailable feed', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            '<rss version="2.0"><channel><item><title>A</title><link>https://vnexpress.net/a</link><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>',
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            '<rss version="2.0"><channel><item><title>A</title><link>https://vnexpress.net/a</link><pubDate>Tue, 20 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>',
          ),
        )
        .mockRejectedValueOnce(new Error('offline')),
    );
    expect(await getPressNews()).toHaveLength(1);
  });
});
