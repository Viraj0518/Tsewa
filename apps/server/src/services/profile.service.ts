import { prisma } from '../config/prisma';
import type { Prisma } from '@prisma/client';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      photos: {
        orderBy: { position: 'asc' },
      },
      prompts: {
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    isVerified: user.isVerified,
    profile: user.profile,
    photos: user.photos,
    prompts: user.prompts,
  };
}

export async function updateProfile(userId: string, data: Prisma.ProfileUpdateInput) {
  // Check if profile exists
  const existing = await prisma.profile.findUnique({
    where: { userId },
  });

  if (existing) {
    return prisma.profile.update({
      where: { userId },
      data,
    });
  }

  // For create, we need required fields - caller must provide them
  const createData = data as Prisma.ProfileCreateWithoutUserInput;
  return prisma.profile.create({
    data: {
      ...createData,
      user: { connect: { id: userId } },
    },
  });
}

export async function addPhoto(userId: string, url: string, isMain: boolean = false) {
  // Count existing photos
  const count = await prisma.photo.count({ where: { userId } });

  if (count >= 6) {
    throw new Error('Maximum 6 photos allowed');
  }

  // If setting as main, unset other main photos
  if (isMain) {
    await prisma.photo.updateMany({
      where: { userId, isMain: true },
      data: { isMain: false },
    });
  }

  return prisma.photo.create({
    data: {
      userId,
      url,
      position: count,
      isMain: isMain || count === 0, // First photo is always main
    },
  });
}

export async function deletePhoto(userId: string, photoId: string) {
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, userId },
  });

  if (!photo) {
    throw new Error('Photo not found');
  }

  await prisma.photo.delete({ where: { id: photoId } });

  // If deleted photo was main, make the first remaining photo main
  if (photo.isMain) {
    const firstPhoto = await prisma.photo.findFirst({
      where: { userId },
      orderBy: { position: 'asc' },
    });

    if (firstPhoto) {
      await prisma.photo.update({
        where: { id: firstPhoto.id },
        data: { isMain: true },
      });
    }
  }

  // Re-order remaining photos
  const remaining = await prisma.photo.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
  });

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await prisma.photo.update({
        where: { id: remaining[i].id },
        data: { position: i },
      });
    }
  }

  return { deleted: true };
}

export async function addPrompt(userId: string, question: string, answer: string) {
  const count = await prisma.conversationPrompt.count({ where: { userId } });

  if (count >= 5) {
    throw new Error('Maximum 5 conversation prompts allowed');
  }

  return prisma.conversationPrompt.create({
    data: {
      userId,
      question,
      answer,
      position: count,
    },
  });
}

export async function updateCategories(userId: string, categories: string[]) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new Error('Profile not found. Create a profile first.');
  }

  return prisma.profile.update({
    where: { userId },
    data: { activeCategories: categories },
  });
}
