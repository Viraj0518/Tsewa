import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProfile,
  updateProfile,
  uploadPhoto,
  deletePhoto,
  addPrompt,
  updateCategories,
  ProfileData,
} from './api';

const PROFILE_KEY = ['profile'];

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ProfileData>) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageUri: string) => uploadPhoto(imageUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useAddPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ question, answer }: { question: string; answer: string }) =>
      addPrompt(question, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}

export function useUpdateCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categories: string[]) => updateCategories(categories),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
