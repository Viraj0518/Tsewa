import { z } from 'zod';

export const profileBasicsSchema = z.object({
  displayName: z.string().min(2).max(50),
  birthDate: z.string().or(z.date()),
  gender: z.enum(['male', 'female', 'non-binary', 'other']),
  bio: z.string().max(500).optional(),
  height: z.number().min(100).max(250).optional(),
});

export const profileCulturalSchema = z.object({
  region: z.enum(['INDIA', 'NEPAL', 'NORTH_AMERICA', 'EUROPE', 'AUSTRALIA_NZ', 'EAST_ASIA', 'TIBET']),
  dialect: z.enum(['LHASA', 'KHAM', 'AMDO', 'OTHER']).optional(),
  buddhaPractice: z.enum(['GELUG', 'KAGYU', 'NYINGMA', 'SAKYA', 'BON', 'SECULAR', 'OTHER']).optional(),
  hometown: z.string().max(100).optional(),
});

export const profileLifestyleSchema = z.object({
  education: z.string().max(100).optional(),
  profession: z.string().max(100).optional(),
  languages: z.array(z.string()).min(1),
  diet: z.enum(['VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN', 'FLEXIBLE']).optional(),
  familyViews: z.enum(['WANT_CHILDREN', 'OPEN_TO_CHILDREN', 'DO_NOT_WANT', 'HAVE_CHILDREN', 'UNDECIDED']).optional(),
  smoking: z.boolean().optional(),
  drinking: z.boolean().optional(),
});

export const profileLocationSchema = z.object({
  currentCity: z.string().max(100).optional(),
  currentCountry: z.string().max(100).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const profilePreferencesSchema = z.object({
  lookingForGender: z.array(z.string()).min(1),
  ageMin: z.number().min(18).max(99).default(18),
  ageMax: z.number().min(18).max(99).default(50),
  maxDistance: z.number().min(1).max(500).default(100),
  regionFilter: z.array(z.string()).optional(),
});

export const profileCategoriesSchema = z.object({
  activeCategories: z.array(z.string()).min(0).max(3),
});

export const conversationPromptSchema = z.object({
  question: z.string(),
  answer: z.string().min(10).max(300),
});

export type ProfileBasicsInput = z.infer<typeof profileBasicsSchema>;
export type ProfileCulturalInput = z.infer<typeof profileCulturalSchema>;
export type ProfileLifestyleInput = z.infer<typeof profileLifestyleSchema>;
export type ProfileLocationInput = z.infer<typeof profileLocationSchema>;
export type ProfilePreferencesInput = z.infer<typeof profilePreferencesSchema>;
