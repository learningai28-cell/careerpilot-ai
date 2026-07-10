import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import {
  analyzeResume,
  fetchLatestAnalysis,
  fetchLatestResume,
  uploadResume,
  validateResumeFile,
} from "./api";

export function useResume() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["resume", user?.id],
    enabled: !!user,
    queryFn: () => fetchLatestResume(user!.id),
  });
}

export function useResumeAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["resume-analysis", user?.id],
    enabled: !!user,
    queryFn: () => fetchLatestAnalysis(user!.id),
  });
}

export function useUploadResume() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const check = validateResumeFile(file);
      if (!check.valid) throw new Error(check.error);
      return uploadResume(file, user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", user?.id] });
    },
  });
}

export function useAnalyzeResume() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: analyzeResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume-analysis", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
    },
  });
}
