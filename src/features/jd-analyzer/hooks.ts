import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { analyzeJD, fetchLatestJD, fetchLatestJDAnalysis } from "./api";

export function useJD() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jd", user?.id],
    enabled: !!user,
    queryFn: () => fetchLatestJD(user!.id),
  });
}

export function useJDAnalysis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["jd-analysis", user?.id],
    enabled: !!user,
    queryFn: () => fetchLatestJDAnalysis(user!.id),
  });
}

export function useAnalyzeJD() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: analyzeJD,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jd", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["jd-analysis", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
    },
  });
}
