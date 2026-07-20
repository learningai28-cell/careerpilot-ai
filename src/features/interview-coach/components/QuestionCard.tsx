import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Volume2, Square, Mic, MicOff } from "lucide-react";
import { Card, CardBody } from "@/shared/components/Card";
import { Textarea } from "@/shared/components/Textarea";
import { Button } from "@/shared/components/Button";
import { useSpeechSynthesis } from "@/shared/hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "@/shared/hooks/useSpeechRecognition";
import { InterviewQuestion, InterviewAnswer } from "../types";
import { useScoreAnswer } from "../hooks";
import { AnswerFeedback } from "./AnswerFeedback";

const categoryLabel: Record<string, string> = {
  hr: "HR",
  technical: "Technical",
  behavioural: "Behavioural",
  case_study: "Case Study",
};

const categoryColor: Record<string, string> = {
  hr: "bg-signal-500/10 text-signal-600 dark:text-signal-400",
  technical: "bg-amber-500/10 text-amber-500",
  behavioural: "bg-signal-500/10 text-signal-600 dark:text-signal-400",
  case_study: "bg-amber-500/10 text-amber-500",
};

export function QuestionCard({
  question,
  index,
  existingAnswer,
}: {
  question: InterviewQuestion;
  index: number;
  existingAnswer?: InterviewAnswer;
}) {
  const [showSample, setShowSample] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [feedback, setFeedback] = useState<InterviewAnswer | null>(existingAnswer ?? null);
  const scoreAnswer = useScoreAnswer();

  const { speak, stop: stopSpeaking, speaking, supported: ttsSupported } = useSpeechSynthesis();
  const {
    startListening,
    stopListening,
    listening,
    transcript,
    resetTranscript,
    supported: sttSupported,
  } = useSpeechRecognition();

  // Feed transcribed speech into the answer textarea as it comes in.
  useEffect(() => {
    if (transcript) setAnswerText(transcript);
  }, [transcript]);

  const handleListenToQuestion = () => {
    if (speaking) {
      stopSpeaking();
      return;
    }
    const fullText = [question.question, ...question.follow_up_questions].join(". ");
    speak(fullText);
  };

  const handleToggleMic = () => {
    if (listening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleSubmit = async () => {
    if (listening) stopListening();
    if (!answerText.trim()) return;
    try {
      const result = await scoreAnswer.mutateAsync({
        questionId: question.id,
        answerText: answerText.trim(),
      });
      setFeedback(result);
      setPracticing(false);
      toast.success("Feedback ready.");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    }
  };

  return (
    <Card>
      <CardBody className="pt-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryColor[question.category]}`}
          >
            {categoryLabel[question.category]}
          </span>
          {question.difficulty && (
            <span className="text-[11px] font-medium capitalize text-slate-400">
              {question.difficulty}
            </span>
          )}
          <span className="ml-auto text-[11px] text-slate-400">Q{index + 1}</span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-relaxed">{question.question}</p>
          {ttsSupported && (
            <button
              onClick={handleListenToQuestion}
              title={speaking ? "Stop" : "Listen to this question"}
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                speaking
                  ? "bg-signal-500 text-white"
                  : "bg-paper-100 text-slate-500 hover:bg-paper-100/80 dark:bg-ink-800"
              }`}
            >
              {speaking ? <Square size={12} /> : <Volume2 size={14} />}
            </button>
          )}
        </div>

        {question.follow_up_questions.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
            {question.follow_up_questions.map((f, i) => (
              <li key={i}>↳ {f}</li>
            ))}
          </ul>
        )}

        {question.star_sample_answer && (
          <button
            onClick={() => setShowSample((s) => !s)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-signal-600 dark:text-signal-400"
          >
            {showSample ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showSample ? "Hide sample answer" : "Show STAR sample answer"}
          </button>
        )}
        {showSample && question.star_sample_answer && (
          <p className="mt-2 rounded-xl bg-paper-100 p-3 text-sm leading-relaxed text-slate-600 dark:bg-ink-800 dark:text-slate-300">
            {question.star_sample_answer}
          </p>
        )}

        {feedback ? (
          <AnswerFeedback
            feedback={feedback}
            onPracticeAgain={() => {
              setFeedback(null);
              setPracticing(true);
              setAnswerText("");
              resetTranscript();
            }}
          />
        ) : practicing ? (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Textarea
                rows={4}
                placeholder={
                  sttSupported
                    ? "Type your answer, or tap the mic to speak it…"
                    : "Type your answer as you'd say it out loud…"
                }
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
              />
              {sttSupported && (
                <button
                  onClick={handleToggleMic}
                  title={listening ? "Stop recording" : "Speak your answer"}
                  className={`absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    listening
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-signal-500 text-white hover:bg-signal-600"
                  }`}
                >
                  {listening ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
            </div>
            {listening && (
              <p className="text-xs font-medium text-signal-600 dark:text-signal-400">
                Listening… tap the mic again when you're done.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={scoreAnswer.isPending || !answerText.trim()}
              >
                {scoreAnswer.isPending ? "Scoring…" : "Submit for feedback"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (listening) stopListening();
                  setPracticing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setPracticing(true)}>
            Practice this answer
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
