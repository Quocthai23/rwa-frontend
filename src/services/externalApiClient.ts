import ky, { type SearchParamsOption } from 'ky';

const externalApiClient = ky.create({
  headers: {
    Accept: 'application/json',
  },
  timeout: 30000,
});

export function getExternalJson<T>(url: string, searchParams?: SearchParamsOption) {
  return externalApiClient.get(url, { searchParams }).json<T>();
}
