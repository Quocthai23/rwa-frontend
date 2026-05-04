import { imageApi } from '@/services/imageService';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const fileName = formData.get('fileName');
    const type = formData.get('type');

    if (!(file instanceof File)) {
      return Response.json({ errors: 'Missing file', success: false }, { status: 400 });
    }

    const avatar = await imageApi.uploadImageToPresignedUrl(file, {
      fileName: typeof fileName === 'string' ? fileName : file.name || 'photo.jpg',
      type: typeof type === 'string' ? type : file.type || 'image/jpeg',
    });

    return Response.json({ data: { avatar } }, { status: 200 });
  } catch (error) {
    return Response.json({ errors: error, success: false }, { status: 500 });
  }
}
