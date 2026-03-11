import { useState } from "react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-20" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      {isMobile ? (
        mobileOpen && (
          <div className="fixed left-0 top-0 z-30 animate-slide-in-left">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        )
      ) : (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          showMenuButton={isMobile}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
