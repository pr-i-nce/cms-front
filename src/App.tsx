import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import ConnectionNotice from "@/components/shared/ConnectionNotice";
import ScreenErrorBoundary from "@/components/shared/ScreenErrorBoundary";
import ScreenLoading from "@/components/shared/ScreenStates";
import { ConfirmProvider } from "@/components/shared/ConfirmProvider";
import UiLatencyTracker from "@/components/shared/UiLatencyTracker";
import { AuthProvider } from "@/lib/auth";
import { store } from "@/store/store";

const Login = lazy(() => import("./pages/Login"));
const Index = lazy(() => import("./pages/Index"));
const Membership = lazy(() => import("./pages/Membership"));
const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const CommitteePage = lazy(() => import("./pages/CommitteePage"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const SMSCenter = lazy(() => import("./pages/SMSCenter"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Profile = lazy(() => import("./pages/Profile"));
const Reports = lazy(() => import("./pages/Reports"));
const Branches = lazy(() => import("./pages/Branches"));
const NotFound = lazy(() => import("./pages/NotFound"));

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>
    <Suspense fallback={<ScreenLoading label="Loading screen" />}>
      {children}
    </Suspense>
  </AppLayout>
);

const ProtectedScreen = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth>
    <LayoutWrapper>{children}</LayoutWrapper>
  </RequireAuth>
);

const App = () => (
  <Provider store={store}>
    <AuthProvider>
      <ConfirmProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <UiLatencyTracker />
            <ConnectionNotice />
            <ScreenErrorBoundary>
              <Suspense fallback={<ScreenLoading label="Opening workspace" />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<ProtectedScreen><Index /></ProtectedScreen>} />
                  <Route path="/membership" element={<ProtectedScreen><Membership /></ProtectedScreen>} />
                  <Route path="/membership/department/:id" element={<ProtectedScreen><DepartmentPage /></ProtectedScreen>} />
                  <Route path="/membership/committee/:id" element={<ProtectedScreen><CommitteePage /></ProtectedScreen>} />
                  <Route path="/membership/member/:id" element={<ProtectedScreen><MemberProfile /></ProtectedScreen>} />
                  <Route path="/sms" element={<ProtectedScreen><SMSCenter /></ProtectedScreen>} />
                  <Route path="/users" element={<ProtectedScreen><UserManagement /></ProtectedScreen>} />
                  <Route path="/profile" element={<ProtectedScreen><Profile /></ProtectedScreen>} />
                  <Route path="/reports" element={<ProtectedScreen><Reports /></ProtectedScreen>} />
                  <Route path="/branches" element={<ProtectedScreen><Branches /></ProtectedScreen>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ScreenErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ConfirmProvider>
    </AuthProvider>
  </Provider>
);

export default App;
