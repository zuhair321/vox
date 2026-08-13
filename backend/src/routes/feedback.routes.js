import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { sanitize } from '../middleware/sanitize.js';

const router = Router();

// Submit feedback (public endpoint for testers)
router.post('/feedback', async (req, res, next) => {
  try {
    const { category, message, rating, userAgent, page } = req.body || {};
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        category: sanitize(String(category || 'general')).slice(0, 50) || 'general',
        message: sanitize(message.trim()).slice(0, 2000),
        rating: rating ? Math.min(5, Math.max(1, Number(rating))) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        page: page ? String(page).slice(0, 200) : null,
        metadata: {
          ip: req.ip,
          timestamp: new Date().toISOString(),
        },
      },
    });

    res.status(201).json({ 
      ok: true, 
      id: feedback.id,
      message: 'Feedback submitted. Thank you!',
    });
  } catch (e) {
    next(e);
  }
});

// Get feedback (admin only - for reviewing tester feedback)
router.get('/feedback', requireAuth, async (req, res, next) => {
  try {
    const { category, rating, limit = 50 } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (rating) where.rating = Number(rating);
    
    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 50, 100),
    });

    res.json({ feedback });
  } catch (e) {
    next(e);
  }
});

// Get feedback stats
router.get('/feedback/stats', requireAuth, async (req, res, next) => {
  try {
    const total = await prisma.feedback.count();
    const byCategory = await prisma.feedback.groupBy({
      by: ['category'],
      _count: { category: true },
    });
    const avgRating = await prisma.feedback.aggregate({
      _avg: { rating: true },
      where: { rating: { not: null } },
    });

    res.json({
      total,
      byCategory,
      averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating).toFixed(1) : null,
    });
  } catch (e) {
    next(e);
  }
});

export const feedbackRouter = router;
