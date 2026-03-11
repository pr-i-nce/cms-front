import { Bell, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface TopNavProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

const TopNav = ({ onMenuToggle, showMenuButton }: TopNavProps) => {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-card border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Welcome back, Admin
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => toast.info("No new notifications")}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-primary/10"
          onClick={() => navigate("/profile")}
        >
          <User className="h-5 w-5 text-primary" />
        </Button>
      </div>
    </header>
  );
};

export default TopNav;
