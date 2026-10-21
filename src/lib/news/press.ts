import Parser from 'rss-parser';
import type { NewsDataItem } from '@/types/news';
export const PRESS_SOURCES = ['VnExpress', 'VietnamPlus'];
const feeds = [
  {
    source: 'VnExpress',
    topic: 'Bất động sản',
    url: 'https://vnexpress.net/rss/bat-dong-san.rss',
    host: 'vnexpress.net',
  },
  {
    source: 'VnExpress',
    topic: 'Kinh doanh',
    url: 'https://vnexpress.net/rss/kinh-doanh.rss',
    host: 'vnexpress.net',
  },
  {
    source: 'VietnamPlus',
    topic: 'Kinh tế',
    url: 'https://www.vietnamplus.vn/rss/kinhte-311.rss',
    host: 'vietnamplus.vn',
  },
];
export function normalizePressItem(
  item: Parser.Item,
  feed: (typeof feeds)[number],
): (NewsDataItem & { source: string }) | null {
  if (!item.title || !item.link) return null;
  let url: URL;
  try {
    url = new URL(item.link);
  } catch {
    return null;
  }
  if (
    url.protocol !== 'https:' ||
    !(url.hostname === feed.host || url.hostname.endsWith('.' + feed.host))
  )
    return null;
  const publishedAt = item.isoDate || item.pubDate;
  if (!publishedAt || !Number.isFinite(Date.parse(publishedAt))) return null;
  url.hash = '';
  return {
    id: url.href,
    title: item.title.replace(/<[^>]*>/g, '').trim(),
    url: url.href,
    publishedAt: new Date(publishedAt).toISOString(),
    topic: feed.topic,
    source: feed.source,
  };
}
export async function getPressNews() {
  const parser = new Parser();
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('RSS unavailable');
      const xml = await response.text();
      if (xml.length > 2000000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Invalid RSS');
      const parsed = await parser.parseString(xml);
      return parsed.items
        .map((item) => normalizePressItem(item, feed))
        .filter((item) => item !== null);
    }),
  );
  const items = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  if (!items.length) throw new Error('No press feeds available');
  return [...new Map(items.map((item) => [item.url, item])).values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}
