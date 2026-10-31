import { useState } from "react";
import { Check, Copy, Linkedin, MessageCircle } from "lucide-react";
import { trackEvent } from "@/shared/lib/analytics";

interface ShareButtonsProps {
  /** Message shown in WhatsApp (the link is appended). */
  text: string;
  url: string;
  /** Analytics label, e.g. "quick_check" or "invite_card". */
  source: string;
}

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors";

/** WhatsApp / LinkedIn / copy-link buttons; no third-party scripts. */
export function ShareButtons({ text, url, source }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
    trackEvent("share_clicked", { channel: "copy", source });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("share_clicked", { channel: "whatsapp", source })}
        className={`${btn} bg-[#25D366] text-white hover:bg-[#1ebe5b]`}
      >
        <MessageCircle size={15} /> WhatsApp
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent("share_clicked", { channel: "linkedin", source })}
        className={`${btn} bg-[#0A66C2] text-white hover:bg-[#0958a8]`}
      >
        <Linkedin size={15} /> LinkedIn
      </a>
      <button
        type="button"
        onClick={copy}
        className={`${btn} border border-line-light hover:bg-paper-100 dark:border-line-dark dark:hover:bg-ink-800`}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
