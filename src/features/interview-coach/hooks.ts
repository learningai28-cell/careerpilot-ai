import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import {
  fetchAnswersForSession,
  fetchLatestSession,
  generateInterview,
  scoreAnswer,
} from "./api";
import { Difficulty } from "./types";

export function useInterviewSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interview-session", user?.id],
    enabled: !!user,
    queryFn: () => fetchLatestSession(user!.id),
  });
}

export function useInterviewAnswers(questionIds: string[]) {
  return useQuery({
    queryKey: ["interview-answers", questionIds],
    enabled: questionIds.length > 0,
    queryFn: () => fetchAnswersForSession(questionIds),
  });
}

export function useGenerateInterview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      targetRole: string;
      experienceYears: number | null;
      difficulty: Difficulty;
    }) => generateInterview(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-session", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
    },
  });
}

export function useScoreAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { questionId: string; answerText: string }) => scoreAnswer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-answers"] });
    },
  });
}
