import { api } from '../../lib/api';

export interface ProfileData {
  displayName?: string;
  birthDate?: string;
  gender?: string;
  bio?: string;
  height?: number;
  region?: string;
  dialect?: string;
  buddhistPractice?: string;
  hometown?: string;
  education?: string;
  profession?: string;
  languages?: string[];
  diet?: string;
  familyViews?: string;
  currentCity?: string;
  currentCountry?: string;
  latitude?: number;
  longitude?: number;
  prompts?: Array<{ question: string; answer: string }>;
  categories?: string[];
}

export interface Photo {
  id: string;
  url: string;
  order: number;
  isMain: boolean;
}

export interface Profile extends ProfileData {
  id: string;
  userId: string;
  photos: Photo[];
  onboardingComplete: boolean;
}

export async function getProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>('/profile');
  return data;
}

export async function updateProfile(profileData: Partial<ProfileData>): Promise<Profile> {
  const { data } = await api.put<Profile>('/profile', profileData);
  return data;
}

export async function uploadPhoto(imageUri: string): Promise<Photo> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('photo', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);

  const { data } = await api.post<Photo>('/profile/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await api.delete(`/profile/photos/${photoId}`);
}

export async function addPrompt(
  question: string,
  answer: string
): Promise<{ id: string; question: string; answer: string }> {
  const { data } = await api.post<{ id: string; question: string; answer: string }>(
    '/profile/prompts',
    { question, answer }
  );
  return data;
}

export async function updateCategories(categories: string[]): Promise<Profile> {
  const { data } = await api.put<Profile>('/profile/categories', { categories });
  return data;
}
