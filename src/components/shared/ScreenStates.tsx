import { Button } from "@/components/ui/button";
import { RefreshCw, TriangleAlert } from "lucide-react";

export const ScreenLoading = ({ label = "Loading" }: { label?: string }) => (
  <div className="space-y-6" role="status" aria-label={label}>
    <div className="space-y-2">
      <div className="h-3 w-28 animate-pulse rounded-full bg-primary/10" />
      <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-foreground/10" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-foreground/5" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border bg-card/70" />)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="h-72 animate-pulse rounded-2xl border bg-card/70 lg:col-span-2" />
      <div className="h-72 animate-pulse rounded-2xl border bg-card/70" />
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

export const ScreenError = ({
  title = "This screen couldn’t load",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) => (
  <div className="flex min-h-64 items-center justify-center p-5">
    <div className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-xl shadow-primary/5">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message || "The server may be slow or your connection may have dropped. Check your connection, then retry."}</p>
      <Button className="mt-5 gap-2" onClick={onRetry ?? (() => window.location.reload())}>
        <RefreshCw className="h-4 w-4" /> Try again
      </Button>
    </div>
  </div>
);

export default ScreenLoading;
