import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Camera, Shield, ShieldCheck, Bell, Lock } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { getUser, updateUser } from "@/api/users";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";

type AuditFields = {
  createdBy: string;
  createdAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
  sentBy?: string;
};

type SystemUserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: string;
  audit?: AuditFields;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
};

const InfoField = ({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold">{label}</Label>
    <Input value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

const Profile = () => {
  const { user, ready, refresh } = useAuth();
  const { has } = usePermissions();
  const confirm = useConfirm();

  const [profile, setProfile] = useState<SystemUserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  const canUpdate = has("USER_UPDATE");

  const initials = useMemo(() => {
    if (!profile?.name) return "";
    return profile.name
      .split(" ")
      .map((part) => part[0])
      .join("");
  }, [profile]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoading(true);
      setLoadError(null);
      try {
        const response = await getUser(user.id);
        const data = response.data;
        setProfile(data);
        setForm({ name: data.name ?? "", email: data.email ?? "", phone: data.phone ?? "" });
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (user && ready) {
      loadProfile();
    } else if (ready) {
      setLoading(false);
    }
  }, [user, ready]);

  const handleSaveProfile = async () => {
    if (!profile || !canUpdate) return;
    const ok = await confirm({
      title: "Save profile",
      description: "Update your profile information?",
      confirmText: "Save",
    });
    if (!ok) return;
    setSavingProfile(true);
    try {
      await updateUser(profile.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      const latest = await getUser(profile.id);
      setProfile(latest.data);
      setForm({
        name: latest.data.name ?? "",
        email: latest.data.email ?? "",
        phone: latest.data.phone ?? "",
      });
      toast.success("Profile updated successfully");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!profile || !canUpdate) return;
    if (!currentPassword || !newPassword) {
      toast.error("Fill in both passwords before saving");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const ok = await confirm({
      title: "Update password",
      description: "Change your account password now?",
      confirmText: "Update",
    });
    if (!ok) return;
    setPasswordLoading(true);
    try {
      await updateUser(profile.id, {
        password: newPassword,
        currentPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    const value = profile?.status ?? "Inactive";
    return (
      <Badge className={value === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
        {value}
      </Badge>
    );
  }, [profile]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  if (loadError) {
    return <div className="p-8 text-center text-destructive">{loadError}</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-muted-foreground">Profile not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal information, security, and notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">{initials || "?"}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{profile?.name}</h2>
                    <p className="text-sm text-muted-foreground">{profile?.role ?? "User"}</p>
                  </div>
                  {statusBadge}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsPhotoOpen(true)}>
                    <Camera className="h-4 w-4" /> Upload photo
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => setIsRoleOpen(true)}>
                    <Shield className="h-4 w-4" /> Manage role
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Security status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm">Two-factor authentication</span>
                <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">Recommended</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm">Last password update</span>
                <span className="text-xs text-muted-foreground">2 months ago</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsSecurityOpen(true)}>
                Review security
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Notifications</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email alerts</p>
                  <p className="text-xs text-muted-foreground">Monthly summaries and admin notices</p>
                </div>
                <Switch
                  checked={emailAlerts}
                  onCheckedChange={(next) => {
                    confirm({
                      title: "Update notification",
                      description: "Change email alert preferences?",
                      confirmText: "Update",
                    }).then((ok) => {
                      if (ok) setEmailAlerts(next);
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">SMS alerts</p>
                  <p className="text-xs text-muted-foreground">Critical activity updates</p>
                </div>
                <Switch
                  checked={smsAlerts}
                  onCheckedChange={(next) => {
                    confirm({
                      title: "Update notification",
                      description: "Change SMS alert preferences?",
                      confirmText: "Update",
                    }).then((ok) => {
                      if (ok) setSmsAlerts(next);
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weekly digest</p>
                  <p className="text-xs text-muted-foreground">Top metrics every Monday</p>
                </div>
                <Switch
                  checked={weeklyDigest}
                  onCheckedChange={(next) => {
                    confirm({
                      title: "Update notification",
                      description: "Change digest preference?",
                      confirmText: "Update",
                    }).then((ok) => {
                      if (ok) setWeeklyDigest(next);
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Personal information</h2>
              <p className="text-xs text-muted-foreground">Audit-ready ancestry</p>
            </div>
            <InfoField label="Full name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <InfoField label="Email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
            <InfoField label="Phone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} />
            <div className="flex items-center justify-between">
              <Button onClick={handleSaveProfile} disabled={!canUpdate || savingProfile} className="gap-2">
                Save changes
              </Button>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                Current role: <span className="font-medium">{profile?.role ?? "User"}</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Password</h2>
              <span className="text-xs text-muted-foreground">Reset credentials</span>
            </div>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label>Current password</Label>
                <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>New password</Label>
                <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Confirm password</Label>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={!canUpdate || passwordLoading} className="gap-2">
                Change password
                <Lock className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Audit</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Created by</span>
                <span>{profile?.audit?.createdBy ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created at</span>
                <span>{profile?.audit?.createdAt ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last edited by</span>
                <span>{profile?.audit?.lastEditedBy ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last edited at</span>
                <span>{profile?.audit?.lastEditedAt ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload photo</DialogTitle>
            <DialogDescription>Coming soon.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsPhotoOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage role</DialogTitle>
            <DialogDescription>Role configuration is managed by admins.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsRoleOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSecurityOpen} onOpenChange={setIsSecurityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Security review</DialogTitle>
            <DialogDescription>Profile security details.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsSecurityOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
