import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { photoUpload } from '../middleware/upload.middleware';
import * as profileService from '../services/profile.service';

const router = Router();

// All routes require auth
router.use(authMiddleware);

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  birthDate: z.string().datetime().optional(),
  gender: z.string().optional(),
  bio: z.string().max(500).optional().nullable(),
  height: z.number().int().min(100).max(250).optional().nullable(),
  region: z.enum(['INDIA', 'NEPAL', 'NORTH_AMERICA', 'EUROPE', 'AUSTRALIA_NZ', 'EAST_ASIA', 'TIBET']).optional(),
  dialect: z.enum(['LHASA', 'KHAM', 'AMDO', 'OTHER']).optional().nullable(),
  buddhaPractice: z
    .enum(['GELUG', 'KAGYU', 'NYINGMA', 'SAKYA', 'BON', 'SECULAR', 'OTHER'])
    .optional()
    .nullable(),
  hometown: z.string().max(100).optional().nullable(),
  education: z.string().max(200).optional().nullable(),
  profession: z.string().max(200).optional().nullable(),
  languages: z.array(z.string()).optional(),
  diet: z.enum(['VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN', 'FLEXIBLE']).optional().nullable(),
  familyViews: z
    .enum(['WANT_CHILDREN', 'OPEN_TO_CHILDREN', 'DO_NOT_WANT', 'HAVE_CHILDREN', 'UNDECIDED'])
    .optional()
    .nullable(),
  smoking: z.boolean().optional().nullable(),
  drinking: z.boolean().optional().nullable(),
  currentCity: z.string().max(100).optional().nullable(),
  currentCountry: z.string().max(100).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  lookingForGender: z.array(z.string()).optional(),
  ageMin: z.number().int().min(18).max(100).optional(),
  ageMax: z.number().int().min(18).max(100).optional(),
  maxDistance: z.number().int().min(1).max(500).optional(),
  regionFilter: z.array(z.enum(['INDIA', 'NEPAL', 'NORTH_AMERICA', 'EUROPE', 'AUSTRALIA_NZ', 'EAST_ASIA', 'TIBET'])).optional(),
});

const addPromptSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(500),
});

const updateCategoriesSchema = z.object({
  categories: z.array(z.string().min(1).max(50)),
});

// GET /api/profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const profile = await profileService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get profile';
    const status = message === 'User not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// PUT /api/profile
router.put('/', async (req: Request, res: Response) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Convert birthDate string to Date if provided
    if (data.birthDate && typeof data.birthDate === 'string') {
      data.birthDate = new Date(data.birthDate as string);
    }

    const profile = await profileService.updateProfile(req.user!.id, data);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(500).json({ error: message });
  }
});

// POST /api/profile/photos
router.post('/photos', photoUpload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No photo file provided' });
      return;
    }

    const isMain = req.body.isMain === 'true' || req.body.isMain === true;
    const url = `/uploads/photos/${req.file.filename}`;

    const photo = await profileService.addPhoto(req.user!.id, url, isMain);
    res.status(201).json(photo);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload photo';
    const status = message === 'Maximum 6 photos allowed' ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/profile/photos/:id
router.delete('/photos/:id', async (req: Request, res: Response) => {
  try {
    const result = await profileService.deletePhoto(req.user!.id, req.params.id as string);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete photo';
    const status = message === 'Photo not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/profile/prompts
router.post('/prompts', async (req: Request, res: Response) => {
  try {
    const parsed = addPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const prompt = await profileService.addPrompt(
      req.user!.id,
      parsed.data.question,
      parsed.data.answer
    );
    res.status(201).json(prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add prompt';
    const status = message === 'Maximum 5 conversation prompts allowed' ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// PUT /api/profile/categories
router.put('/categories', async (req: Request, res: Response) => {
  try {
    const parsed = updateCategoriesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const profile = await profileService.updateCategories(req.user!.id, parsed.data.categories);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update categories';
    res.status(500).json({ error: message });
  }
});

export default router;
