// Turbo routes: /api/turbo/*
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import * as auth from '../services/auth.service.js';

export const turboRouter = Router();

// GET /api/turbo/status - Get current user's Turbo status
turboRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    
    if (!user) {
      return res.json({
        hasTurbo: false,
        turboSince: null,
        features: getTurboFeatures()
      });
    }
    
    res.json({
      hasTurbo: user.hasTurbo !== undefined ? user.hasTurbo : true,
      turboSince: user.turboSince ?? null,
      features: getTurboFeatures()
    });
  } catch (e) { next(e); }
});

// GET /api/turbo/features - Get all Turbo features
turboRouter.get('/features', async (req, res, next) => {
  try {
    res.json({
      features: getTurboFeatures()
    });
  } catch (e) { next(e); }
});

// POST /api/turbo/enable - Enable Turbo for current user
turboRouter.post('/enable', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        hasTurbo: true,
        turboSince: new Date()
      },
    });
    
    res.json({
      hasTurbo: true,
      turboSince: user.turboSince,
      features: getTurboFeatures()
    });
  } catch (e) { next(e); }
});

// POST /api/turbo/disable - Disable Turbo for current user
turboRouter.post('/disable', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        hasTurbo: false,
        turboSince: null
      },
    });
    
    res.json({
      hasTurbo: false,
      turboSince: null,
      features: []
    });
  } catch (e) { next(e); }
});

// POST /api/turbo/enable-all - Enable Turbo for all users (admin only)
turboRouter.post('/enable-all', requireAuth, async (req, res, next) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    
    if (!['FOUNDER', 'ADMIN'].includes(user.role)) {
      throw new HttpError(403, 'Only admins can enable Turbo for all users.');
    }
    
    await prisma.user.updateMany({
      data: {
        hasTurbo: true,
        turboSince: new Date()
      },
    });
    
    res.json({
      message: 'Turbo enabled for all users',
      count: await prisma.user.count()
    });
  } catch (e) { next(e); }
});

// Helper function to get Turbo features
function getTurboFeatures() {
  return [
    {
      id: 'custom_emojis',
      name: 'Custom Emojis',
      description: 'Use custom emojis in messages',
      icon: '⚡'
    },
    {
      id: 'higher_quality_audio',
      name: 'Higher Quality Audio',
      description: '384kbps audio quality in voice chat',
      icon: '🎧'
    },
    {
      id: 'profile_badges',
      name: 'Profile Badges',
      description: 'Exclusive Turbo profile badge',
      icon: '🏆'
    },
    {
      id: 'message_enhancements',
      name: 'Message Enhancements',
      description: 'Larger file uploads and enhanced messages',
      icon: '💬'
    },
    {
      id: 'priority_support',
      name: 'Priority Support',
      description: 'Faster response from support team',
      icon: '⭐'
    },
    {
      id: 'server_boosting',
      name: 'Server Boosting',
      description: 'Boost servers to show your support',
      icon: '🚀'
    },
    {
      id: 'animated_avatars',
      name: 'Animated Avatars',
      description: 'Use GIFs and animated avatars',
      icon: '🎭'
    },
    {
      id: 'custom_banners',
      name: 'Custom Banners',
      description: 'Personalize your profile with custom banners',
      icon: '🎨'
    }
  ];
}
