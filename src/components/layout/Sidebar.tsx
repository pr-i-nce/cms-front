import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, MessageSquare, Shield,
  BarChart3, Settings2, LogOut, Church, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/permissions";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Membership", path: "/membership", icon: Users },
  { label: "SMS Center", path: "/sms", icon: MessageSquare },
  { label: "Branches", path: "/branches", icon: Church },
  { label: "User Management", path: "/users", icon: Shield },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/profile", icon: Settings2 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canSeeBranches = has("BRANCH_UPDATE") || has("BRANCH_CREATE") || has("BRANCH_DEACTIVATE");
  const canSeeUsers = has("USER_CREATE") || has("USER_UPDATE") || has("USER_DEACTIVATE");

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "app-sidebar flex h-screen shrink-0 flex-col sticky top-0 transition-all duration-300 z-30",
        collapsed ? "w-[72px]" : "w-[258px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-[76px] items-center gap-3 border-b border-sidebar-border px-5">
        <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-1">
          <img src="/pwa-192.png" alt="Church logo" className="h-8 w-8 rounded-lg" />
        </div>
        {!collapsed && (
        <span className="truncate text-sm font-semibold tracking-[0.16em] text-sidebar-accent-foreground">
            PENIEL <span className="font-normal tracking-normal text-sidebar-foreground/65">CMS</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      {!collapsed && <p className="px-5 pb-1 pt-6 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/45">Church office</p>}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {navItems.filter((item) => {
          if (item.path === "/branches") return canSeeBranches;
          if (item.path === "/users") return canSeeUsers;
          return true;
        }).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-200",
              isActive(item.path)
                ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,.7)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-sidebar-border px-3 pb-4 pt-3">
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/75 transition-colors hover:bg-destructive/15 hover:text-red-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center rounded-xl p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
