import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, MessageSquare, Shield,
  BarChart3, User, LogOut, Church, ChevronLeft, ChevronRight,
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
  { label: "Profile", path: "/profile", icon: User },
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
        "bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 transition-all duration-300 z-30",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="bg-sidebar-primary rounded-lg p-1.5 shrink-0">
          <Church className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-sidebar-accent-foreground truncate">
            PCC
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.filter((item) => {
          if (item.path === "/branches") return canSeeBranches;
          if (item.path === "/users") return canSeeUsers;
          return true;
        }).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              isActive(item.path)
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1">
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
