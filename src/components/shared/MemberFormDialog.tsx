import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/shared/SearchableSelect";

type MemberFormValues = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  department: string;
  role: string;
  status: "Active" | "Inactive";
};

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValues?: Partial<MemberFormValues>;
  departments: string[];
  roles: string[];
  onSubmit: (values: MemberFormValues) => void;
}

const emptyMember: MemberFormValues = {
  name: "",
  email: "",
  phone: "",
  gender: "Male",
  department: "",
  role: "",
  status: "Active",
};

const MemberFormDialog = ({
  open,
  onOpenChange,
  title,
  defaultValues,
  departments,
  roles,
  onSubmit,
}: MemberFormDialogProps) => {
  const mergedDefaults = useMemo(
    () => ({ ...emptyMember, ...defaultValues }),
    [defaultValues],
  );
  const [form, setForm] = useState<MemberFormValues>(mergedDefaults);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(mergedDefaults);
      setErrors({});
    }
  }, [open, mergedDefaults]);

  const update = (key: keyof MemberFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required";
    if (!form.gender.trim()) nextErrors.gender = "Gender is required";
    if (!form.department.trim()) nextErrors.department = "Department is required";
    if (!form.role.trim()) nextErrors.role = "Role is required";
    if (!form.status.trim()) nextErrors.status = "Status is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Provide member details to save the record.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Email (optional)</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(value) => update("gender", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
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
              {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Department</Label>
              <SearchableSelect
                value={form.department}
                onChange={(value) => update("department", value)}
                placeholder="Select department"
                searchPlaceholder="Search departments..."
                items={departments.map((dept) => ({ value: dept, label: dept }))}
              />
              {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <SearchableSelect
                value={form.role}
                onChange={(value) => update("role", value)}
                placeholder="Select role"
                searchPlaceholder="Search roles..."
                items={roles.map((role) => ({ value: role, label: role }))}
              />
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MemberFormDialog;
