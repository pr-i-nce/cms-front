import { useEffect, useState } from "react";
import { ArrowDownToLine, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

const AppInstallSetting = () => {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
      toast.success("Peniel CMS has been installed");
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions((current) => !current);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } catch {
      setShowInstructions(true);
      toast.error("Your browser could not open the install prompt. Try its menu instead.");
    }
  };

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <section className="app-install-card rounded-2xl border p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="app-install-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
            {installed ? <Check className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your workspace</p>
            <h2 className="mt-1 text-lg font-semibold">{installed ? "App installed" : "Install Peniel CMS"}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Keep the church workspace one tap away, in its own window, with a quick app launch from your device.
            </p>
          </div>
        </div>
        <Button onClick={install} disabled={installed} className="shrink-0 gap-2 sm:min-w-40">
          {installed ? <Check className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
          {installed ? "Installed" : installPrompt ? "Install app" : "Get the app"}
        </Button>
      </div>
      {showInstructions && !installed && (
        <p className="mt-4 rounded-xl border border-primary/15 bg-white/60 px-4 py-3 text-sm text-muted-foreground" role="status">
          {ios
            ? "In Safari, tap Share, then choose Add to Home Screen."
            : "Open your browser menu and choose Install app or Add to Home screen. The option appears when this site is eligible for installation."}
        </p>
      )}
    </section>
  );
};

export default AppInstallSetting;
