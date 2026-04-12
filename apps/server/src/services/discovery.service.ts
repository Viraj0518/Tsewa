import { prisma } from '../config/prisma';

export async function getDeck(userId: string, category?: string, limit: number = 20) {
  // Get the requesting user's profile for preference matching
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    throw new Error('Profile required to browse');
  }

  const profile = user.profile;

  // Get IDs of users already swiped on
  const swipedIds = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { swipedId: true },
  });
  const swipedSet = swipedIds.map((s) => s.swipedId);

  // Get blocked user IDs (both directions)
  const blockedByMe = await prisma.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  const blockedMe = await prisma.block.findMany({
    where: { blockedId: userId },
    select: { blockerId: true },
  });
  const blockedIds = [
    ...blockedByMe.map((b) => b.blockedId),
    ...blockedMe.map((b) => b.blockerId),
  ];

  const excludeIds = [...new Set([userId, ...swipedSet, ...blockedIds])];

  // Calculate age range from birth dates
  const now = new Date();
  const maxBirthDate = new Date(now.getFullYear() - profile.ageMin, now.getMonth(), now.getDate());
  const minBirthDate = new Date(now.getFullYear() - profile.ageMax - 1, now.getMonth(), now.getDate());

  // Build the where clause for profiles
  const profileWhere: Record<string, unknown> = {
    userId: { notIn: excludeIds },
    birthDate: {
      gte: minBirthDate,
      lte: maxBirthDate,
    },
  };

  // Gender filter
  if (profile.lookingForGender.length > 0) {
    profileWhere.gender = { in: profile.lookingForGender };
  }

  // Region filter
  if (profile.regionFilter.length > 0) {
    profileWhere.region = { in: profile.regionFilter };
  }

  // Category filter
  if (category) {
    profileWhere.activeCategories = { has: category };
  }

  const profiles = await prisma.profile.findMany({
    where: profileWhere,
    include: {
      user: {
        select: {
          id: true,
          lastActiveAt: true,
          isActive: true,
          photos: {
            orderBy: { position: 'asc' },
          },
          prompts: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
    orderBy: [
      { user: { lastActiveAt: 'desc' } },
    ],
    take: limit * 2, // Fetch extra, we'll shuffle and trim
  });

  // Only show active users
  const activeProfiles = profiles.filter((p) => p.user.isActive);

  // Shuffle for randomness
  for (let i = activeProfiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeProfiles[i], activeProfiles[j]] = [activeProfiles[j], activeProfiles[i]];
  }

  return activeProfiles.slice(0, limit).map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    birthDate: p.birthDate,
    gender: p.gender,
    bio: p.bio,
    region: p.region,
    dialect: p.dialect,
    buddhaPractice: p.buddhaPractice,
    hometown: p.hometown,
    currentCity: p.currentCity,
    currentCountry: p.currentCountry,
    education: p.education,
    profession: p.profession,
    languages: p.languages,
    activeCategories: p.activeCategories,
    lastActiveAt: p.user.lastActiveAt,
    photos: p.user.photos,
    prompts: p.user.prompts,
  }));
}

export async function getDailyPicks(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if picks already exist for today
  const existingPicks = await prisma.dailyPick.findMany({
    where: {
      forUserId: userId,
      date: today,
    },
    include: {
      pickedUser: {
        include: {
          profile: true,
          photos: {
            orderBy: { position: 'asc' },
          },
          prompts: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  if (existingPicks.length > 0) {
    return existingPicks.map((pick) => ({
      pickId: pick.id,
      userId: pick.pickedUser.id,
      profile: pick.pickedUser.profile,
      photos: pick.pickedUser.photos,
      prompts: pick.pickedUser.prompts,
    }));
  }

  // Generate new picks
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    throw new Error('Profile required for daily picks');
  }

  // Get swiped + blocked IDs
  const swipedIds = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { swipedId: true },
  });
  const blockedByMe = await prisma.block.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  const blockedMe = await prisma.block.findMany({
    where: { blockedId: userId },
    select: { blockerId: true },
  });
  const excludeIds = [
    userId,
    ...swipedIds.map((s) => s.swipedId),
    ...blockedByMe.map((b) => b.blockedId),
    ...blockedMe.map((b) => b.blockerId),
  ];

  // Fetch candidates - prioritize same region/dialect
  const sameRegionProfiles = await prisma.profile.findMany({
    where: {
      userId: { notIn: excludeIds },
      user: { isActive: true },
      region: user.profile.region,
    },
    include: {
      user: {
        select: {
          id: true,
          photos: { orderBy: { position: 'asc' } },
          prompts: { orderBy: { position: 'asc' } },
        },
      },
    },
    take: 20,
  });

  const otherProfiles = await prisma.profile.findMany({
    where: {
      userId: { notIn: [...excludeIds, ...sameRegionProfiles.map((p) => p.userId)] },
      user: { isActive: true },
    },
    include: {
      user: {
        select: {
          id: true,
          photos: { orderBy: { position: 'asc' } },
          prompts: { orderBy: { position: 'asc' } },
        },
      },
    },
    take: 10,
  });

  // Weight: 70% same region, 30% other
  const allCandidates = [...sameRegionProfiles, ...otherProfiles];

  // Shuffle
  for (let i = allCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCandidates[i], allCandidates[j]] = [allCandidates[j], allCandidates[i]];
  }

  // Same-region candidates get double representation for weighted pick
  const weighted = [
    ...sameRegionProfiles,
    ...sameRegionProfiles, // double weight
    ...otherProfiles,
  ];

  // Shuffle weighted pool
  for (let i = weighted.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weighted[i], weighted[j]] = [weighted[j], weighted[i]];
  }

  // Pick unique users (5-10)
  const pickCount = Math.min(Math.max(5, allCandidates.length), 10);
  const pickedUserIds = new Set<string>();
  const picks: typeof allCandidates = [];

  for (const candidate of weighted) {
    if (pickedUserIds.has(candidate.userId)) continue;
    pickedUserIds.add(candidate.userId);
    picks.push(candidate);
    if (picks.length >= pickCount) break;
  }

  // Persist daily picks
  const dailyPicks = await Promise.all(
    picks.map((pick) =>
      prisma.dailyPick.create({
        data: {
          forUserId: userId,
          pickedUserId: pick.userId,
          date: today,
        },
      })
    )
  );

  return picks.map((p, i) => ({
    pickId: dailyPicks[i].id,
    userId: p.userId,
    profile: {
      displayName: p.displayName,
      birthDate: p.birthDate,
      gender: p.gender,
      bio: p.bio,
      region: p.region,
      dialect: p.dialect,
      buddhaPractice: p.buddhaPractice,
      hometown: p.hometown,
      currentCity: p.currentCity,
      currentCountry: p.currentCountry,
      activeCategories: p.activeCategories,
    },
    photos: p.user.photos,
    prompts: p.user.prompts,
  }));
}
