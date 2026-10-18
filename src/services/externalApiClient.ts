import ky, { type SearchParamsOption } from 'ky';
import { API_BASE_URL } from '@/constants/env';

export const externalApiClient = ky.create({
  headers: {
    Accept: 'application/json',
  },
  timeout: 30000,
});

export const backendApiClient = ky.create({
  prefixUrl: (API_BASE_URL || 'http://localhost:3001').replace(/\/$/, ''),
  headers: {
    Accept: 'application/json',
  },
  timeout: 30000,
});

export function getExternalJson<T>(url: string, searchParams?: SearchParamsOption) {
  return externalApiClient.get(url, { searchParams }).json<T>();
}
