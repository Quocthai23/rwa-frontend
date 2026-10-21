import { NextResponse } from 'next/server';
import { getPressNews, PRESS_SOURCES } from '@/lib/news/press';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const integer = (value: string | null, fallback: number) =>
    value !== null && /^\d+$/.test(value) ? Number(value) : fallback;
  const skip = Math.min(integer(params.get('skip'), 0), 10000);
  const take = Math.max(1, Math.min(integer(params.get('take'), 15), 50));
  const sources =
    params
      .get('topics')
      ?.split(',')
      .filter((value) => PRESS_SOURCES.includes(value)) ?? [];
  try {
    const items = await getPressNews();
    const filtered = sources.length ? items.filter((item) => sources.includes(item.source)) : items;
    return NextResponse.json({ data: filtered.slice(skip, skip + take), total: filtered.length });
  } catch {
    return NextResponse.json(
      { message: 'News feeds are temporarily unavailable' },
      { status: 503 },
    );
  }
}
