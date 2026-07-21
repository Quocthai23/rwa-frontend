import { NextRequest, NextResponse } from 'next/server';

const FPT_API_KEY = process.env.FPT_API_KEY || '';
const FPT_CHECKFACE_URL = process.env.FPT_CHECKFACE_URL || 'https://api.fpt.ai/dmp/checkface/v1';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file1 = formData.getAll('file[]')[0];
    const file2 = formData.getAll('file[]')[1];

    if (!file1 || !file2) {
      return NextResponse.json({ error: 'Both files are required' }, { status: 400 });
    }

    // Forward the form data to FPT AI
    const fptFormData = new FormData();
    fptFormData.append('file[]', file1);
    fptFormData.append('file[]', file2);

    const response = await fetch(FPT_CHECKFACE_URL, {
      method: 'POST',
      headers: {
        'api-key': FPT_API_KEY,
      },
      body: fptFormData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('FPT CheckFace Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
