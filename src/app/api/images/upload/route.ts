import { NextRequest } from 'next/server';

import { getAccessTokenFromRequest, errorResponse } from '@/app/api/_utils/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Validate auth — read httpOnly access_token cookie from browser request
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return errorResponse('Unauthorized', 401, { code: 'missing-token' });
    }

    // 2. Parse the incoming multipart form data
    const incomingForm = await request.formData();
    const file = incomingForm.get('file');

    if (!(file instanceof File)) {
      return errorResponse('Missing file', 400, { code: 'missing-file' });
    }

    const fileName =
      typeof incomingForm.get('fileName') === 'string'
        ? (incomingForm.get('fileName') as string)
        : file.name || 'photo.jpg';

    const type =
      typeof incomingForm.get('type') === 'string'
        ? (incomingForm.get('type') as string)
        : file.type || 'image/jpeg';

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3002';
    const backendUploadUrl = `${apiBase}/images/upload`;

    // 3. Forward the file to the NestJS backend using a fresh FormData
    //    The original File object is forwarded as-is to avoid re-reading streams.
    const forwardForm = new FormData();
    forwardForm.append('file', file, fileName);

    const backendResponse = await fetch(backendUploadUrl, {
      method: 'POST',
      // Do NOT set Content-Type — let fetch set multipart/form-data boundary automatically
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: forwardForm,
    });

    if (!backendResponse.ok) {
      const errText = await backendResponse.text().catch(() => String(backendResponse.status));
      console.error('[upload] Backend responded:', backendResponse.status, errText);
      return errorResponse(
        `Storage error (${backendResponse.status})`,
        502,
        { code: 'backend-upload-failed' },
      );
    }

    // 4. Parse backend JSON — NestJS /images/upload returns:
    //    { success: true, result: { variants: [url], ... } }
    const backendData = (await backendResponse.json()) as {
      success?: boolean;
      result?: { variants?: string[] };
    };

    const avatar = backendData?.result?.variants?.[0];
    if (!avatar) {
      console.error('[upload] Unexpected backend payload:', JSON.stringify(backendData));
      return errorResponse('No image URL returned from storage', 502, { code: 'no-upload-url' });
    }

    return Response.json({ data: { avatar } }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[upload] Unhandled error:', message);
    return Response.json({ errors: message, success: false }, { status: 500 });
  }
}
