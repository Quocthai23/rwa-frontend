import { NextResponse } from 'next/server';
import { newsService } from '@/services/newsService';

export async function GET() {
  try {
    const topics = await newsService.getNewsTopics();
    return NextResponse.json({ data: topics });
  } catch (error) {
    console.error('[News Topics API Route Error]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
