import { NextResponse } from 'next/server';
import { newsService } from '@/services/newsService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get('skip') || 0);
  const take = Number(searchParams.get('take') || 20);

  const topicsParam = searchParams.get('topics');
  const topics = topicsParam ? topicsParam.split(',') : undefined;

  try {
    const data = await newsService.getNewsList({ skip, take, topics });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[News API Route Error]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
