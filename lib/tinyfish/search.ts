// TinyFish Search API - server-side only
import { getBaseHeaders, withRetry, handleApiError } from './client';
import type { TinyFishSearchResponse } from './types';

const SEARCH_BASE_URL = 'https://api.search.tinyfish.ai';

export interface SearchOptions {
  query: string;
  location?: string;
  language?: string;
  recency_minutes?: number;
  after_date?: string;
  before_date?: string;
  max_results?: number;
}

export async function tinyfishSearch(
  options: SearchOptions
): Promise<TinyFishSearchResponse> {
  const params = new URLSearchParams({ query: options.query });
  if (options.location) params.set('location', options.location);
  if (options.language) params.set('language', options.language);
  if (options.recency_minutes) params.set('recency_minutes', String(options.recency_minutes));
  if (options.after_date) params.set('after_date', options.after_date);
  if (options.before_date) params.set('before_date', options.before_date);

  const url = `${SEARCH_BASE_URL}?${params.toString()}`;
  console.log(`[TinyFish Search] Query: ${options.query}`);

  return withRetry(async () => {
    const response = await fetch(url, {
      method: 'GET',
      headers: getBaseHeaders(),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const body = await response.text();
      const err = handleApiError(response.status, body);
      throw err;
    }

    const data = await response.json();
    // Normalize response to expected shape
    return normalizeSearchResponse(data, options.query);
  });
}

function normalizeSearchResponse(data: unknown, query: string): TinyFishSearchResponse {
  const raw = data as Record<string, unknown>;
  
  // Handle various possible response structures
  let results = [];
  if (Array.isArray(raw.results)) {
    results = raw.results;
  } else if (Array.isArray(raw.items)) {
    results = raw.items;
  } else if (Array.isArray(raw.organic)) {
    results = raw.organic;
  } else if (Array.isArray(data)) {
    results = data as unknown[];
  }

  const normalized = results.map((item: Record<string, unknown>) => ({
    title: String(item.title || item.name || ''),
    url: String(item.url || item.link || item.href || ''),
    snippet: String(item.snippet || item.description || item.summary || ''),
    domain: String(item.domain || extractDomain(String(item.url || item.link || ''))),
  }));

  return {
    results: normalized.filter((r) => r.url),
    query,
    total: typeof raw.total === 'number' ? raw.total : normalized.length,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
