// TinyFish Fetch API - server-side only
import { getBaseHeaders, withRetry, handleApiError } from './client';
import type { TinyFishFetchRequest, TinyFishFetchResponse } from './types';

const FETCH_BASE_URL = 'https://api.fetch.tinyfish.ai';

export async function tinyfishFetch(
  request: TinyFishFetchRequest
): Promise<TinyFishFetchResponse> {
  console.log(`[TinyFish Fetch] URLs: ${request.urls.join(', ')}`);

  return withRetry(async () => {
    const response = await fetch(FETCH_BASE_URL, {
      method: 'POST',
      headers: getBaseHeaders(),
      body: JSON.stringify({
        urls: request.urls,
        format: request.format || 'markdown',
        purpose: request.purpose,
        links: request.links ?? false,
        image_links: request.image_links ?? false,
        iframe_links: request.iframe_links ?? false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const body = await response.text();
      const err = handleApiError(response.status, body);
      throw err;
    }

    const data = await response.json();
    return normalizeFetchResponse(data);
  });
}

function normalizeFetchResponse(data: unknown): TinyFishFetchResponse {
  const raw = data as Record<string, unknown>;

  // Handle possible structures
  let results = [];
  if (Array.isArray(raw.results)) {
    results = raw.results;
  } else if (Array.isArray(raw.pages)) {
    results = raw.pages;
  } else if (Array.isArray(data)) {
    results = data as unknown[];
  } else if (raw.content || raw.markdown || raw.text) {
    // Single result
    results = [raw];
  }

  const normalized = results.map((item: Record<string, unknown>) => ({
    url: String(item.url || ''),
    content: String(item.content || item.markdown || item.text || item.html || ''),
    format: String(item.format || 'markdown'),
    title: item.title ? String(item.title) : undefined,
    links: Array.isArray(item.links) ? item.links.map(String) : undefined,
    error: item.error ? String(item.error) : undefined,
  }));

  return { results: normalized };
}

export async function fetchSinglePage(url: string, purpose?: string): Promise<string> {
  const response = await tinyfishFetch({
    urls: [url],
    format: 'markdown',
    purpose,
  });
  return response.results[0]?.content || '';
}
