import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/shared/SearchableSelect";

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  password?: string;
  memberId?: string;
  groupIds?: string[];
};

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  roles: string[];
  defaultValues?: Partial<UserFormValues>;
  leaderOptions?: { id: string; name: string; email?: string | null; phone?: string | null }[];
  groups?: { id: string; name: string }[];
  showGroups?: boolean;
  showPassword?: boolean;
  onSubmit: (values: UserFormValues) => void;
}

const emptyUser: UserFormValues = {
  name: "",
  email: "",
  phone: "",
  role: "",
  status: "Active",
  password: "",
  memberId: "",
  groupIds: [],
};

const UserFormDialog = ({
  open,
  onOpenChange,
  title,
  roles,
  defaultValues,
  leaderOptions = [],
  groups = [],
  showGroups = false,
  showPassword = false,
  onSubmit,
}: UserFormDialogProps) => {
  const mergedDefaults = useMemo(
    () => ({ ...emptyUser, ...defaultValues }),
    [defaultValues],
  );
  const [form, setForm] = useState<UserFormValues>(mergedDefaults);

  useEffect(() => {
    if (open) {
      setForm(mergedDefaults);
    }
  }, [open, mergedDefaults]);

  useEffect(() => {
    if (form.role.trim().toLowerCase() !== "leader" && form.memberId) {
      setForm((prev) => ({ ...prev, memberId: "" }));
    }
  }, [form.role, form.memberId]);

  useEffect(() => {
    if (form.role.trim().toLowerCase() !== "leader") return;
    const leaderGroup = groups.find((g) => (g.name || "").toLowerCase().includes("leader"));
    if (!leaderGroup) return;
    const current = form.groupIds ?? [];
    if (current.includes(leaderGroup.id)) return;
    setForm((prev) => ({ ...prev, groupIds: [...current, leaderGroup.id] }));
  }, [form.role, form.groupIds, groups]);

  useEffect(() => {
    if (!form.groupIds || form.groupIds.length === 0) return;
    const validGroupIds = new Set(groups.map((g) => g.id));
    const filtered = form.groupIds.filter((id) => validGroupIds.has(id));
    if (filtered.length !== form.groupIds.length) {
      setForm((prev) => ({ ...prev, groupIds: filtered }));
    }
  }, [form.groupIds, groups]);

  const update = (key: keyof UserFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isLeader = form.role.trim().toLowerCase() === "leader";

  const handleLeaderSelect = (value: string) => {
    const leader = leaderOptions.find((option) => option.id === value);
    if (!leader) return;
    setForm((prev) => ({
      ...prev,
      memberId: leader.id,
      name: leader.name || prev.name,
      email: leader.email || prev.email,
      phone: leader.phone || prev.phone,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter user details to create or update the account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {isLeader && (
            <div className="grid gap-2">
              <Label>Leader</Label>
              <Select value={form.memberId} onValueChange={handleLeaderSelect}>
                <SelectTrigger><SelectValue placeholder="Select leader" /></SelectTrigger>
                <SelectContent>
                  {leaderOptions.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} disabled={isLeader} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} disabled={isLeader} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} disabled={isLeader} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => update("role", value)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => update("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {showGroups && (
            <div className="grid gap-2">
              <Label>Groups</Label>
              <SearchableSelect
                value={form.groupIds ?? []}
                onChange={(value) => setForm((prev) => ({ ...prev, groupIds: Array.isArray(value) ? value : [value] }))}
                placeholder="Select groups"
                searchPlaceholder="Search groups..."
                multiple
                items={groups.map((group) => ({ value: group.id, label: group.name }))}
              />
            </div>
          )}
        {showPassword && (
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input type="password" value={form.password || ""} onChange={(e) => update("password", e.target.value)} />
          </div>
        )}
      </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormDialog;
