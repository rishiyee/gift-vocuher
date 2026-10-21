"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (isStandalone || (!promptEvent && !isIOS)) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={promptEvent ? () => void install() : () => setShowIOSHelp((open) => !open)}
        aria-expanded={isIOS ? showIOSHelp : undefined}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-xs transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {isIOS ? <Share className="size-4" /> : <Download className="size-4" />}
        <span className="hidden sm:inline">Add to Home Screen</span><span className="sm:hidden">Install</span>
      </button>
      {isIOS && showIOSHelp && (
        <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <p className="font-semibold">Add Gift Voucher to Home Screen</p>
          <p className="mt-1 text-muted-foreground">In Safari, tap <Share className="mx-0.5 inline size-4 align-text-bottom" /> Share, then choose <strong className="text-foreground">Add to Home Screen</strong>.</p>
        </div>
      )}
    </div>
  );
}
