import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

// Helper to extract error message from any error type
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === 'string') return errorObj.message;
    if (Array.isArray(errorObj.errors)) {
      return errorObj.errors.join(', ');
    }
    if (typeof errorObj.error === 'string') return errorObj.error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return 'Unknown error';
}

export type PresignedUrlItem = {
  key: string;
  uploadURL: string;
};

export type PresignedUrlResponse = PresignedUrlItem[];

export type UploadImageResponse = {
  errors: string[];
  messages: string[];
  result: {
    creator: string;
    filename: string;
    id: string;
    requireSignedURLs: boolean;
    uploaded: string;
    variants: string[];
  } | null;
  success: boolean;
};

/**
 * Upload a single file to storage using presigned URL
 * @param uploadURL - The presigned URL to upload to
 * @param imageUri - Local file URI
 * @param options - File metadata
 * @returns The URL of the uploaded file (variants[0])
 */
async function uploadFileToStorage(
  uploadURL: string,
  imageSource: string | File,
  options?: { fileName?: string; type?: string },
): Promise<string> {
  const formData = new FormData();

  if (typeof imageSource === 'string') {
    const response = await fetch(imageSource);
    const blob = await response.blob();
    const fileName = options?.fileName ?? 'photo.jpg';
    const fileType = options?.type ?? (blob.type || 'image/jpeg');
    const file = new File([blob], fileName, { type: fileType });
    formData.append('file', file);
  } else {
    formData.append('file', imageSource, options?.fileName ?? imageSource.name ?? 'photo.jpg');
  }

  try {
    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });

    let data: UploadImageResponse;

    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[uploadFileToStorage] Parse error:', parseError);
      throw new Error(`Failed to parse upload response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok || !data.success || !data.result?.variants?.[0]) {
      const errorMsg = data.errors?.[0] ?? data.messages?.[0] ?? 'Upload failed';

      console.error('[uploadFileToStorage] Upload failed:', {
        ok: response.ok,
        success: data.success,
        errors: data.errors,
        messages: data.messages,
      });

      throw new Error(errorMsg);
    }

    return data.result.variants[0];
  } catch (error) {
    console.error('[uploadFileToStorage] Caught error:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
      stringified: JSON.stringify(error, null, 2),
    });

    // Re-throw with more context
    const errorMsg = getErrorMessage(error);
    throw new Error(`Upload failed: ${errorMsg}`);
  }
}

/**
 * Upload multiple images in parallel (e.g., for feedback attachments)
 * 1. Gets N presigned URLs based on number of files
 * 2. Uploads all files in parallel with Promise.all
 * @param files - Array of file objects with uri and metadata
 * @returns Array of uploaded file URLs
 */
export async function uploadMultipleImagesToPresignedUrl(
  files: Array<{
    uri: string | File;
    fileName?: string;
    type?: string;
  }>,
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  // Get presigned URLs for all files
  const presignedUrls = await apiClient.get<PresignedUrlResponse>(
    isServer ? `images/presigned-url?files=${files.length}` : '/api/images/presigned-url',
    isServer ? undefined : { files: files.length },
    isServer
      ? undefined
      : {
          baseUrl: CLIENT_BASE_URL,
          skipAuth: true,
        },
  );

  if (!presignedUrls || presignedUrls.length !== files.length) {
    throw new Error(`Expected ${files.length} presigned URLs, got ${presignedUrls?.length ?? 0}`);
  }

  // Upload all files in parallel
  const uploadPromises = files.map(async (file, index) => {
    const presignedUrl = presignedUrls[index];
    if (!presignedUrl?.uploadURL) {
      throw new Error(`Missing presigned URL for file ${index}`);
    }

    try {
      const result = await uploadFileToStorage(presignedUrl.uploadURL, file.uri, {
        fileName: file.fileName,
        type: file.type ?? (file.uri instanceof File ? file.uri.type : undefined),
      });

      return result;
    } catch (error) {
      const fileName =
        file.fileName ||
        (typeof file.uri === 'string' ? file.uri.split('/').pop() : file.uri.name) ||
        'unknown';
      const errorMsg = getErrorMessage(error);
      console.error('[uploadMultiple] File', index, 'failed:', errorMsg);
      throw new Error(`Failed to upload "${fileName}": ${errorMsg}`);
    }
  });

  const results = await Promise.all(uploadPromises);

  return results;
}

/**
 * Upload a single image (e.g., for avatar)
 * Uses uploadMultipleImagesToPresignedUrl with 1 file
 * @returns avatar URL
 */
export async function uploadImageToPresignedUrl(
  imageSource: string | File,
  options?: { fileName?: string; type?: string },
): Promise<string> {
  const urls = await uploadMultipleImagesToPresignedUrl([
    {
      uri: imageSource,
      fileName: options?.fileName,
      type: options?.type ?? (imageSource instanceof File ? imageSource.type : undefined),
    },
  ]);

  return urls[0];
}

export const imageApi = {
  getPresignedUrl: async (files = 1): Promise<PresignedUrlResponse> => {
    return apiClient.get<PresignedUrlResponse>(
      isServer ? `images/presigned-url?files=${files}` : '/api/images/presigned-url',
      isServer ? undefined : { files },
      isServer
        ? undefined
        : {
            baseUrl: CLIENT_BASE_URL,
            skipAuth: true,
          },
    );
  },
  uploadImageToPresignedUrl,
  uploadMultipleImagesToPresignedUrl,
};
