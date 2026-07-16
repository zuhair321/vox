// GIPHY API — free tier (no key needed for limited use, or use demo mode)
const GIF_API_KEY = 'dc6zaTOxFJmzC'; // Public beta key from Giphy
const GIF_SEARCH_URL = (q: string, offset = 0) =>
  `https://api.giphy.com/v1/gifs/search?api_key=${GIF_API_KEY}&q=${encodeURIComponent(q)}&limit=20&offset=${offset}&rating=g&lang=en`;
const GIF_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIF_API_KEY}&limit=20&rating=g`;

export interface GifItem {
  id: string;
  url: string;
  title: string;
}

export async function searchGifs(query: string, offset = 0): Promise<{ gifs: GifItem[]; hasMore: boolean }> {
  try {
    const url = query ? GIF_SEARCH_URL(query, offset) : GIF_TRENDING_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Giphy API error: ${res.status}`);
    
    const data = await res.json();
    const items = data.data || [];
    
    const gifs: GifItem[] = items.map((item: any) => ({
      id: item.id,
      url: item.images.fixed_width.url,
      title: item.title || '',
    }));
    
    return {
      gifs,
      hasMore: items.length === 20, // Giphy returns 20 items per page
    };
  } catch (error) {
    console.error('[Giphy] Error searching GIFs:', error);
    return { gifs: [], hasMore: false };
  }
}

export async function getTrendingGifs(offset = 0): Promise<{ gifs: GifItem[]; hasMore: boolean }> {
  return searchGifs('', offset);
}