import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const variants: Record<string, string> = {
    Active: "bg-success/15 text-success border-success/30",
    Inactive: "bg-destructive/15 text-destructive border-destructive/30",
    Delivered: "bg-success/15 text-success border-success/30",
    Sent: "bg-success/15 text-success border-success/30",
    Pending: "bg-warning/15 text-warning border-warning/30",
    Failed: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[status] || "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      <span className={cn(
        "w-1.5 h-1.5 rounded-full mr-1.5",
        status === "Active" || status === "Delivered" || status === "Sent" ? "bg-success" :
        status === "Pending" ? "bg-warning" :
        status === "Inactive" || status === "Failed" ? "bg-destructive" : "bg-muted-foreground"
      )} />
      {status}
    </span>
  );
};

export default StatusBadge;
