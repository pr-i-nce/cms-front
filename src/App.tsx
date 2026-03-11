import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import { ConfirmProvider } from "@/components/shared/ConfirmProvider";
import RequireAuth from "@/components/auth/RequireAuth";
import SessionExpiredDialog from "@/components/auth/SessionExpiredDialog";
import UiLatencyTracker from "@/components/shared/UiLatencyTracker";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Membership from "./pages/Membership";
import DepartmentPage from "./pages/DepartmentPage";
import CommitteePage from "./pages/CommitteePage";
import MemberProfile from "./pages/MemberProfile";
import SMSCenter from "./pages/SMSCenter";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Branches from "./pages/Branches";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/lib/auth";
import { Provider } from "react-redux";
import { store } from "@/store/store";

const queryClient = new QueryClient();

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <AuthProvider>
        <ConfirmProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <SessionExpiredDialog />
            <UiLatencyTracker />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RequireAuth><LayoutWrapper><Index /></LayoutWrapper></RequireAuth>} />
              <Route path="/membership" element={<RequireAuth><LayoutWrapper><Membership /></LayoutWrapper></RequireAuth>} />
              <Route path="/membership/department/:id" element={<RequireAuth><LayoutWrapper><DepartmentPage /></LayoutWrapper></RequireAuth>} />
              <Route path="/membership/committee/:id" element={<RequireAuth><LayoutWrapper><CommitteePage /></LayoutWrapper></RequireAuth>} />
              <Route path="/membership/member/:id" element={<RequireAuth><LayoutWrapper><MemberProfile /></LayoutWrapper></RequireAuth>} />
              <Route path="/sms" element={<RequireAuth><LayoutWrapper><SMSCenter /></LayoutWrapper></RequireAuth>} />
              <Route path="/users" element={<RequireAuth><LayoutWrapper><UserManagement /></LayoutWrapper></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><LayoutWrapper><Profile /></LayoutWrapper></RequireAuth>} />
              <Route path="/reports" element={<RequireAuth><LayoutWrapper><Reports /></LayoutWrapper></RequireAuth>} />
              <Route path="/branches" element={<RequireAuth><LayoutWrapper><Branches /></LayoutWrapper></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ConfirmProvider>
      </AuthProvider>
    </Provider>
  </QueryClientProvider>
);

export default App;
