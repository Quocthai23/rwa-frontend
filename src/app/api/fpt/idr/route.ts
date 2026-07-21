import { NextRequest, NextResponse } from 'next/server';

const FPT_API_KEY = process.env.FPT_API_KEY || '';
const FPT_IDR_URL = process.env.FPT_IDR_URL || 'https://api.fpt.ai/vision/idr/vnm';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Forward the form data to FPT AI
    const fptFormData = new FormData();
    fptFormData.append('image', image);

    const response = await fetch(FPT_IDR_URL, {
      method: 'POST',
      headers: {
        'api-key': FPT_API_KEY,
      },
      body: fptFormData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('FPT IDR Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
