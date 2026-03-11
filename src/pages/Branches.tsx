import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, MessageSquare, Pencil, Plus, ShieldOff, UserMinus } from "lucide-react";
import { listBranchPastorAssignments, listBranches, getBranch, createBranch, updateBranch, deactivateBranch, addBranchPastor, removeBranchPastor } from "@/api/branches";
import { listMembers } from "@/api/members";
import SmsQuickSendDialog from "@/components/shared/SmsQuickSendDialog";
import { usePermissions } from "@/lib/permissions";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { toast } from "sonner";

type Branch = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
  pastorsCount?: number;
};

type PastorAssignment = {
  branchId: string;
  branchName: string;
  role?: string;
  member: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  };
};

const Branches = () => {
  const { has } = usePermissions();
  const confirm = useConfirm();
  const canAccessBranches = has("BRANCH_UPDATE") || has("BRANCH_CREATE") || has("BRANCH_DEACTIVATE");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pastors, setPastors] = useState<PastorAssignment[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewBranchId, setViewBranchId] = useState<string | null>(null);
  const [viewBranch, setViewBranch] = useState<any | null>(null);
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [quickSmsConfig, setQuickSmsConfig] = useState<{ recipientType: "individual" | "selected"; recipientId?: string; recipientIds?: string[]; recipientLabel?: string } | null>(null);
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [branchFormMode, setBranchFormMode] = useState<"create" | "edit">("create");
  const [branchForm, setBranchForm] = useState({ id: "", name: "", location: "", address: "", phone: "", email: "", status: "Active" });
  const [pastorFormOpen, setPastorFormOpen] = useState(false);
  const [pastorForm, setPastorForm] = useState({ branchId: "", memberId: "", role: "" });
  const [pastorFormMode, setPastorFormMode] = useState<"create" | "edit">("create");

  useEffect(() => {
    const load = async () => {
      if (!canAccessBranches) {
        setLoading(false);
        setLoadError(null);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [branchesRes, pastorsRes, membersRes] = await Promise.all([
          listBranches({ page: 1, pageSize: 200 }),
          listBranchPastorAssignments(),
          listMembers({ page: 1, pageSize: 500 }),
        ]);
        setBranches(branchesRes.data);
        setPastors(pastorsRes.data ?? []);
        setMembers(membersRes.data ?? []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load branches");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canAccessBranches]);

  if (!canAccessBranches) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You do not have access to branches.
      </div>
    );
  }

  useEffect(() => {
    if (!viewBranchId) return;
    const loadBranch = async () => {
      try {
        const res = await getBranch(viewBranchId);
        setViewBranch(res.data);
      } catch {
        setViewBranch(null);
      }
    };
    loadBranch();
  }, [viewBranchId]);

  const openQuickSms = (config: { recipientType: "individual" | "selected"; recipientId?: string; recipientIds?: string[]; recipientLabel?: string }) => {
    setQuickSmsConfig(config);
    setQuickSmsOpen(true);
  };

  const openCreateBranch = () => {
    setBranchFormMode("create");
    setBranchForm({ id: "", name: "", location: "", address: "", phone: "", email: "", status: "Active" });
    setBranchFormOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setBranchFormMode("edit");
    setBranchForm({
      id: branch.id,
      name: branch.name || "",
      location: branch.location || "",
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      status: branch.status || "Active",
    });
    setBranchFormOpen(true);
  };

  const submitBranchForm = async () => {
    if (!branchForm.name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    if (branchFormMode === "create") {
      await createBranch({
        name: branchForm.name.trim(),
        location: branchForm.location || undefined,
        address: branchForm.address || undefined,
        phone: branchForm.phone || undefined,
        email: branchForm.email || undefined,
      });
      toast.success("Branch created");
    } else {
      await updateBranch(branchForm.id, {
        name: branchForm.name.trim(),
        location: branchForm.location || undefined,
        address: branchForm.address || undefined,
        phone: branchForm.phone || undefined,
        email: branchForm.email || undefined,
        status: branchForm.status || "Active",
      });
      toast.success("Branch updated");
    }
    const branchesRes = await listBranches({ page: 1, pageSize: 200 });
    setBranches(branchesRes.data);
    setBranchFormOpen(false);
  };

  const handleDeactivateBranch = async (branch: Branch) => {
    const ok = await confirm({
      title: "Deactivate branch",
      description: `Deactivate ${branch.name}?`,
      confirmText: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    await deactivateBranch(branch.id);
    const branchesRes = await listBranches({ page: 1, pageSize: 200 });
    setBranches(branchesRes.data);
    toast.info("Branch deactivated");
  };

  const openAssignPastor = (branchId?: string, memberId?: string, role?: string) => {
    setPastorFormMode(memberId ? "edit" : "create");
    setPastorForm({ branchId: branchId || "", memberId: memberId || "", role: role || "" });
    setPastorFormOpen(true);
  };

  const submitPastorForm = async () => {
    if (!pastorForm.branchId || !pastorForm.memberId) {
      toast.error("Select branch and pastor");
      return;
    }
    await addBranchPastor(pastorForm.branchId, {
      memberId: pastorForm.memberId,
      role: pastorForm.role || undefined,
    });
    const pastorsRes = await listBranchPastorAssignments();
    setPastors(pastorsRes.data ?? []);
    const branchRes = await listBranches({ page: 1, pageSize: 200 });
    setBranches(branchRes.data);
    setPastorFormOpen(false);
    toast.success(pastorFormMode === "create" ? "Pastor assigned" : "Assignment updated");
  };

  const handleRemovePastor = async (branchId: string, memberId: string, memberName?: string) => {
    const ok = await confirm({
      title: "Remove pastor",
      description: `Remove ${memberName || "this pastor"} from this branch?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    await removeBranchPastor(branchId, memberId);
    const pastorsRes = await listBranchPastorAssignments();
    setPastors(pastorsRes.data ?? []);
    const branchRes = await listBranches({ page: 1, pageSize: 200 });
    setBranches(branchRes.data);
    toast.info("Pastor removed");
  };

  const allPastorIds = Array.from(new Set(pastors.map((entry) => entry.member.id)));
  const pastorRoleOptions = ["Senior Pastor", "Associate Pastor", "Youth Pastor", "Pastor"];
  const branchOptions = useMemo(() => branches.map((b) => ({ value: b.id, label: b.name })), [branches]);
  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name,
        keywords: [m.email, m.phone],
      })),
    [members],
  );

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading branches...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Branches</h1>
        <p className="text-muted-foreground">Manage church branches and pastor assignments</p>
      </div>

      <Tabs defaultValue="pastors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pastors">Pastors</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="pastors">
          <div className="bg-card rounded-lg border p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Pastors</h2>
                <p className="text-sm text-muted-foreground">Pastors and their branches</p>
              </div>
              <div className="flex items-center gap-2">
                {has("BRANCH_PASTOR_ADD") && (
                  <Button size="sm" onClick={() => openAssignPastor()}>
                    <Plus className="h-4 w-4 mr-2" /> Add pastor
                  </Button>
                )}
                {has("SMS_SEND") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQuickSms({ recipientType: "selected", recipientIds: allPastorIds, recipientLabel: "All pastors" })}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" /> Send to all pastors
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pastor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastors.map((entry, idx) => (
                    <TableRow key={`${entry.branchId}-${entry.member.id}-${idx}`}>
                      <TableCell className="font-medium">{entry.member.name}</TableCell>
                      <TableCell>{entry.role || entry.member.role || "Pastor"}</TableCell>
                      <TableCell>{entry.branchName}</TableCell>
                      <TableCell>{entry.member.phone || "-"}</TableCell>
                      <TableCell>{entry.member.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewBranchId(entry.branchId)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {has("SMS_SEND") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openQuickSms({ recipientType: "individual", recipientId: entry.member.id, recipientLabel: `To ${entry.member.name}` })}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          {has("BRANCH_PASTOR_ADD") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAssignPastor(entry.branchId, entry.member.id, entry.role || entry.member.role || "")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {has("BRANCH_PASTOR_REMOVE") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePastor(entry.branchId, entry.member.id, entry.member.name)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pastors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pastors assigned yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="branches">
          <div className="bg-card rounded-lg border p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">Branches</h2>
                <p className="text-sm text-muted-foreground">Church branch locations</p>
              </div>
              {has("BRANCH_CREATE") && (
                <Button size="sm" onClick={openCreateBranch}>
                  <Plus className="h-4 w-4 mr-2" /> Add branch
                </Button>
              )}
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pastors</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.location || "-"}</TableCell>
                      <TableCell>{branch.phone || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={branch.status || "Active"} />
                      </TableCell>
                      <TableCell>{branch.pastorsCount ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewBranchId(branch.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {has("BRANCH_UPDATE") && (
                            <Button variant="ghost" size="icon" onClick={() => openEditBranch(branch)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {has("BRANCH_DEACTIVATE") && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeactivateBranch(branch)}>
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {branches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No branches available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(viewBranchId)} onOpenChange={(open) => !open && setViewBranchId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Branch details</DialogTitle>
            <DialogDescription>Branch information and assigned pastors.</DialogDescription>
          </DialogHeader>
          {viewBranch?.branch ? (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{viewBranch.branch.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{viewBranch.branch.location || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right">{viewBranch.branch.address || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{viewBranch.branch.phone || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{viewBranch.branch.email || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary">{viewBranch.branch.status || "Active"}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Pastors</p>
                {viewBranch.pastors?.length ? (
                  <div className="space-y-2">
                    {viewBranch.pastors.map((entry: any) => (
                      <div key={entry.memberId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{entry.member?.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.role || entry.member?.role || "Pastor"}</p>
                        </div>
                        {has("SMS_SEND") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openQuickSms({ recipientType: "individual", recipientId: entry.memberId, recipientLabel: `To ${entry.member?.name}` })}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pastors assigned.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading branch details...</p>
          )}
          <DialogFooter>
            {has("SMS_SEND") && viewBranch?.pastors?.length ? (
              <Button
                variant="outline"
                onClick={() => {
                  const ids = Array.from(new Set(viewBranch.pastors.map((p: any) => p.memberId)));
                  openQuickSms({ recipientType: "selected", recipientIds: ids, recipientLabel: `All pastors in ${viewBranch.branch?.name || "branch"}` });
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Send to all pastors
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setViewBranchId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={branchFormOpen} onOpenChange={setBranchFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{branchFormMode === "create" ? "Add branch" : "Edit branch"}</DialogTitle>
            <DialogDescription>Provide branch details for this location.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={branchForm.location} onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchFormOpen(false)}>Cancel</Button>
            <Button onClick={submitBranchForm}>{branchFormMode === "create" ? "Create" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pastorFormOpen} onOpenChange={setPastorFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pastorFormMode === "create" ? "Assign pastor" : "Edit pastor assignment"}</DialogTitle>
            <DialogDescription>Select branch and pastor details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Branch</Label>
              <SearchableSelect
                value={pastorForm.branchId}
                onChange={(value) => setPastorForm({ ...pastorForm, branchId: value })}
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
                items={branchOptions}
              />
            </div>
            <div className="space-y-1">
              <Label>Pastor</Label>
              <SearchableSelect
                value={pastorForm.memberId}
                onChange={(value) => setPastorForm({ ...pastorForm, memberId: value })}
                placeholder="Select pastor"
                searchPlaceholder="Search members..."
                items={memberOptions}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <SearchableSelect
                value={pastorForm.role}
                onChange={(value) => setPastorForm({ ...pastorForm, role: value })}
                placeholder="Select role"
                searchPlaceholder="Search roles..."
                items={pastorRoleOptions.map((role) => ({ value: role, label: role }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPastorFormOpen(false)}>Cancel</Button>
            <Button onClick={submitPastorForm}>{pastorFormMode === "create" ? "Assign" : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {quickSmsConfig && (
        <SmsQuickSendDialog
          open={quickSmsOpen}
          onOpenChange={setQuickSmsOpen}
          recipientType={quickSmsConfig.recipientType}
          recipientId={quickSmsConfig.recipientId}
          recipientIds={quickSmsConfig.recipientIds}
          recipientLabel={quickSmsConfig.recipientLabel}
        />
      )}
    </div>
  );
};

export default Branches;
