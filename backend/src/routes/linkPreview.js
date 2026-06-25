// Open-Graph link preview.
//   GET /api/link-preview?url=https://example.com
//
// Fetches the target page, parses <meta property="og:..."> (and common
// fallbacks) with cheerio, and returns a normalized card. Results are cached
// in-memory for 1 hour per URL to avoid hammering the same origin.
import { Router } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { HttpError } from '../middleware/error.js';

export const linkPreviewRouter = Router();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // url → { at, data }

// Allow only http(s) and block obvious internal/loopback targets so this
// can't be abused as an SSRF pivot.
function isSafeUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) // raw IPv4
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

linkPreviewRouter.get('/link-preview', async (req, res, next) => {
  try {
    const url = String(req.query.url || '').trim();
    if (!url) throw new HttpError(400, 'url query param is required.');
    if (!isSafeUrl(url)) throw new HttpError(400, 'Only public http(s) URLs are supported.');

    const cached = cache.get(url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VOX-LinkPreview/1.0 (+https://vox.gg)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        size: 2 * 1024 * 1024, // 2MB cap to avoid giant payloads
      });
    } catch {
      clearTimeout(timeout);
      // Network/timeout errors: degrade gracefully with a minimal card so the
      // UI still renders something useful instead of erroring.
      const data = { url, title: deriveHost(url), description: '', image: '', site: deriveHost(url) };
      cache.set(url, { at: Date.now(), data });
      return res.json(data);
    } finally {
      clearTimeout(timeout);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      const data = { url, title: deriveHost(url), description: '', image: '', site: deriveHost(url) };
      cache.set(url, { at: Date.now(), data });
      return res.json(data);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const pick = (...selectors) => {
      for (const sel of selectors) {
        const el = $(sel).first();
        if (el.length) {
          const val = el.attr('content') || el.attr('href') || el.text();
          if (val && val.trim()) return val.trim();
        }
      }
      return '';
    };

    const title = pick('meta[property="og:title"]', 'meta[name="twitter:title"]', 'title');
    const description = pick(
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    );
    let image = pick('meta[property="og:image"]', 'meta[name="twitter:image"]');
    const site = pick('meta[property="og:site_name"]') || deriveHost(url);

    // Resolve relative image URLs against the page URL.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = '';
      }
    }

    const data = {
      url,
      title: (title || deriveHost(url)).slice(0, 300),
      description: description.slice(0, 500),
      image: image.slice(0, 1024),
      site,
    };
    cache.set(url, { at: Date.now(), data });
    res.json(data);
  } catch (e) { next(e); }
});

function deriveHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
