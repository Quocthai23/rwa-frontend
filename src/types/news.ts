/**
 * News API Types
 * Type definitions for news-related API responses
 */

/**
 * Raw response from TradingEconomics API
 */
export type TradingEconomicsRawItem = {
  author?: string;
  category?: string;
  country?: string;
  date?: string;
  description?: string;
  ID?: number;
  Id?: number;
  id?: number;
  image?: string;
  importance?: number | string;
  thumbnail?: string;
  title?: string;
  url?: string;
  Url?: string;
};

/**
 * Raw response from Bloomberg API
 */
export type BloombergRawItem = {
  abstract?: string;
  canonicalUrl?: string;
  coverImage?:
    | {
        src?: string;
        url?: string;
      }
    | string;
  date?: string;
  description?: string;
  excerpt?: string;
  featured?: boolean;
  headline?: string;
  heroImage?: string;
  id?: string;
  image?:
    | {
        src?: string;
        url?: string;
      }
    | string;
  link?: string;
  name?: string;
  promoted?: boolean;
  publishedAt?: string;
  publishedTime?: string;
  storyId?: string;
  summary?: string;
  thumbnail?: string;
  title?: string;
  url?: string;
};

/**
 * Raw response from Bloomberg stories endpoint
 */
export type BloombergStoriesResponse = {
  data?: BloombergRawItem[];
  items?: BloombergRawItem[];
  stories?: BloombergRawItem[];
};

/**
 * Raw response from Reuters API
 */
export type ReutersRawItem = {
  _id?: string;
  abstract?: string;
  canonical_url?: string;
  description?: {
    basic?: string;
    default?: string;
  };
  display_date?: string;
  headline?: string;
  headlines?: {
    basic?: string;
    default?: string;
  };
  id?: string;
  last_updated?: string;
  link?: string;
  promo_items?: {
    basic?: { url?: string };
    lead_art?: { url?: string };
  };
  promoted?: boolean;
  published_time?: string;
  related_images?: { url?: string }[];
  summary?: string;
  thumbnail?: { url?: string };
  title?: string;
  url?: string;
  website_url?: string;
};

/**
 * Raw response from Reuters content endpoint
 */
export type ReutersContentResponse = {
  articles?: ReutersRawItem[];
  content_elements?: ReutersRawItem[];
};

/**
 * Raw response from VnWallStreet API
 */
export type VnWallStreetRawItem = {
  content: string;
  createtime: string;
  img?: string;
  important?: string;
  messageid: string;
};

/**
 * VnWallStreet API response wrapper
 */
export type VnWallStreetResponse = {
  allCount?: number;
  data?: VnWallStreetRawItem[];
};

/**
 * Normalized news item used throughout the app
 */
export type NewsItem = {
  author?: string;
  categoryId: string;
  content: string;
  country?: string;
  createdAt: string;
  excerpt: string;
  id: string;
  isFeatured: boolean;
  language: string;
  publishedAt: string;
  readTimeMinutes: number;
  slug: string;
  source: string;
  thumbnailUrl: null | string;
  title: string;
  updatedAt: string;
  url: null | string;
};

/**
 * Paginated news list response
 */
export type NewsListResponse = {
  data: NewsItem[];
  limit: number;
  page: number;
  total: number;
};

/**
 * News data item from new home/news API
 */
export type NewsDataItem = {
  authors?: string[];
  id: string;
  imageUrl?: string | null;
  publishedAt: string;
  summary?: string | null;
  title: string;
  topic: string;
  url: string;
};

/**
 * News data API response with pagination
 */
export type NewsDataResponse = {
  data: NewsDataItem[];
  total: number;
};

/**
 * Get news list request parameters
 */
export type GetNewsListRequest = {
  skip?: number;
  take?: number;
  topics?: string[];
};
