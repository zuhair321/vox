import { api } from './client';

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  site: string;
}

export const fetchLinkPreview = (url: string) =>
  api(`/api/link-preview?url=${encodeURIComponent(url)}`) as Promise<LinkPreview>;
