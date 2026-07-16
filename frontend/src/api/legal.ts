import { api } from './client';

export const fetchLegalDocument = (type: 'privacy' | 'terms' | 'guidelines') =>
  api<{ content: string }>(`/api/legal/${type}`);
export const fetchPrivacyPolicy = () => api<{ content: string }>('/api/legal/privacy');
export const fetchTermsOfService = () => api<{ content: string }>('/api/legal/terms');
export const fetchCommunityGuidelines = () => api<{ content: string }>('/api/legal/guidelines');