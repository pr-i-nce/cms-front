import { Bell, Menu, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

const TopNav = ({ onMenuToggle, showMenuButton }: TopNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const section = (() => {
    const path = location.pathname;
    if (path === "/") return "Dashboard";
    if (path.startsWith("/membership/member/")) return "Member profile";
    if (path.startsWith("/membership/department/")) return "Department";
    if (path.startsWith("/membership/committee/")) return "Committee";
    if (path.startsWith("/membership")) return "Membership";
    if (path.startsWith("/sms")) return "SMS center";
    if (path.startsWith("/branches")) return "Branches";
    if (path.startsWith("/users")) return "User management";
    if (path.startsWith("/reports")) return "Reports";
    if (path.startsWith("/profile")) return "Settings";
    return "Church office";
  })();

  return (
    <header className="app-topbar sticky top-0 z-20 flex h-[76px] items-center justify-between border-b px-4 sm:px-7">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <p className="hidden text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:block">Peniel Christian Church</p>
          <h2 className="truncate text-sm font-semibold text-foreground sm:mt-0.5 sm:text-base">{section}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-primary"
          onClick={() => toast.info("No new notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl border border-border/70 bg-primary/5 text-primary hover:bg-primary/10"
          onClick={() => navigate("/profile")}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
        <span className="hidden max-w-32 truncate text-sm font-medium text-foreground/80 md:block">{user?.name ?? "Account"}</span>
      </div>
    </header>
  );
};

export default TopNav;
