import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { extractResumeData, fetchProfileData, saveProfileData } from "./api";
import { ResumeProfileData } from "./types";

export function useProfileData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["resume-profile", user?.id],
    enabled: !!user,
    queryFn: () => fetchProfileData(user!.id),
  });
}

export function useExtractResumeData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: extractResumeData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
    },
  });
}

export function useSaveProfileData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ResumeProfileData) => saveProfileData(user!.id, profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume-profile", user?.id] });
    },
  });
}
