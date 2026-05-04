import { NextResponse } from 'next/server';
import { getCalendarEventsAPI } from '@/services/calendarService';
import { CalendarEventType } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = Number(searchParams.get('skip') || 0);
    const take = Number(searchParams.get('take') || 20);
    const date = searchParams.get('dates') || searchParams.get('date') || undefined;
    const type = (searchParams.get('type') as CalendarEventType) || undefined;
    const data = await getCalendarEventsAPI({ skip, take, date, type });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Calendar API Route Error]:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
