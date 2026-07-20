import { useCallback, useEffect, useState } from "react";

/**
 * Wraps the browser's built-in SpeechSynthesis API. Free, no network call,
 * no API key — but not universally supported (Safari/iOS has known quirks
 * with voice loading). `supported` lets callers hide the feature cleanly
 * rather than showing a button that silently does nothing.
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel(); // stop anything already playing
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // Stop any speech if the component using this unmounts mid-playback.
  useEffect(() => stop, [stop]);

  return { speak, stop, speaking, supported };
}
