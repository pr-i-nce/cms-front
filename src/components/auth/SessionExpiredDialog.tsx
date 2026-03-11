import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const SessionExpiredDialog = () => {
  const navigate = useNavigate();
  const { sessionExpired, acknowledgeSessionExpired } = useAuth();

  const handleLogin = () => {
    acknowledgeSessionExpired();
    navigate("/login", { replace: true });
  };

  return (
    <Dialog open={sessionExpired} onOpenChange={(open) => !open && acknowledgeSessionExpired()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>Your session has timed out after 2 hours. Please log in again.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleLogin}>Go to Login</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionExpiredDialog;
