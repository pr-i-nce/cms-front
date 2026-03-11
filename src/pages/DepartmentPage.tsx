import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, Pencil, MessageSquare, Plus, UserMinus, Users } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SearchableSelect from "@/components/shared/SearchableSelect";
import MemberFormDialog from "@/components/shared/MemberFormDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { toast } from "sonner";
import { ApiMeta } from "@/lib/api";
import { lookupMembers, updateMember } from "@/api/members";
import { getDepartment, listDepartments, listDepartmentMembers, addDepartmentMember, removeDepartmentMember, listDepartmentRoles } from "@/api/departments";
import { usePermissions } from "@/lib/permissions";
import SmsQuickSendDialog from "@/components/shared/SmsQuickSendDialog";

type AuditFields = {
  createdBy: string;
  createdAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
  sentBy?: string;
};

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  department?: string;
  role?: string;
  status: "Active" | "Inactive";
  dateJoined: string;
  audit?: AuditFields;
};

type Department = {
  id: string;
  name: string;
  description?: string;
  leader?: string;
  membersCount?: number;
  status: "Active" | "Inactive";
  audit?: AuditFields;
};

type DepartmentMember = { departmentId: string; memberId: string; role: string; member?: Member };

const PAGE_SIZE = 10;

const DepartmentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dept, setDept] = useState<Department | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [departmentMembersMeta, setDepartmentMembersMeta] = useState<ApiMeta["pagination"] | null>(null);
  const [departmentMembersLoading, setDepartmentMembersLoading] = useState(false);
  const [departmentMembersError, setDepartmentMembersError] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([]);
  const [isAddToDeptOpen, setIsAddToDeptOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quickSmsConfig, setQuickSmsConfig] = useState<{ recipientType: "individual" | "department"; recipientId?: string; recipientLabel?: string } | null>(null);
  const confirm = useConfirm();
  const { has } = usePermissions();

  const deptMembers = useMemo(() => departmentMembers.filter((entry) => entry.departmentId === dept?.id), [dept, departmentMembers]);

  const members = useMemo(() => {
    return deptMembers
      .map((entry) => {
        if (!entry.member) return null;
        return { member: entry.member, role: entry.role };
      })
      .filter((item) => item !== null) as { member: Member; role: string }[];
  }, [deptMembers]);

  const filtered = useMemo(() => members, [members]);

  const totalPages = departmentMembersMeta?.totalPages ?? 1;
  const totalItems = departmentMembersMeta?.total ?? filtered.length;
  const paginated = filtered;
  const editingMember = editingMemberId
    ? members.find((entry) => entry.member.id === editingMemberId)?.member ?? null
    : null;
  const memberOptions = useMemo(
    () =>
      allMembers.map((member) => ({
        value: member.id,
        label: member.name,
        keywords: [member.phone, member.email],
      })),
    [allMembers],
  );

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [deptRes, allDepartmentsRes, rolesRes] = await Promise.all([
          getDepartment(id),
          listDepartments({ page: 1, pageSize: 200 }),
          listDepartmentRoles(),
        ]);
        const rawDept = deptRes.data.department;
        setDept(rawDept ? {
          ...rawDept,
          audit: {
            createdBy: rawDept.createdBy ?? "System",
            createdAt: rawDept.createdAt ?? "-",
            lastEditedBy: rawDept.lastEditedBy ?? "System",
            lastEditedAt: rawDept.lastEditedAt ?? "-",
            sentBy: rawDept.sentBy ?? undefined,
          },
        } : null);
        setAllDepartments(allDepartmentsRes.data);
        setDepartmentRoles(rolesRes.data.length ? rolesRes.data : ["Member"]);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const loadDepartmentMembers = useCallback(async () => {
    if (!dept) return;
    setDepartmentMembersLoading(true);
    setDepartmentMembersError(null);
    try {
      const res = await listDepartmentMembers(dept.id, {
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      });
      setDepartmentMembers(
        res.data.map((entry) => ({
          departmentId: dept.id,
          memberId: entry.memberId,
          role: entry.role,
          member: entry.member,
        })),
      );
      setDepartmentMembersMeta(res.meta?.pagination ?? null);
    } catch (err) {
      setDepartmentMembersError(err instanceof Error ? err.message : "Failed to load department members");
    } finally {
      setDepartmentMembersLoading(false);
    }
  }, [dept, page, search, roleFilter]);

  useEffect(() => {
    loadDepartmentMembers();
  }, [loadDepartmentMembers]);

  useEffect(() => {
    setPage(1);
  }, [dept?.id]);

  const addMemberToDepartment = async () => {
    if (!dept || !selectedMemberId) return;
    const member = allMembers.find((m) => m.id === selectedMemberId);
    const ok = await confirm({
      title: "Add to department",
      description: `Add ${member?.name || "this member"} to ${dept.name}?`,
      confirmText: "Add",
    });
    if (!ok) return;
    await addDepartmentMember(dept.id, { memberId: selectedMemberId, role: selectedRole });
    await loadDepartmentMembers();
    setSelectedMemberId("");
    setSelectedRole("Member");
    toast.success("Member added to department");
  };

  const handleMemberLookup = async (query: string) => {
    if (!query || query.length < 2) {
      setAllMembers([]);
      return;
    }
    try {
      const res = await lookupMembers(query);
      setAllMembers(res.data ?? []);
    } catch {
      setAllMembers([]);
    }
  };

  const removeMemberFromDepartment = async (memberId: string, memberName?: string) => {
    if (!dept) return;
    const ok = await confirm({
      title: "Remove member",
      description: `Remove ${memberName || "this member"} from ${dept.name}?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    await removeDepartmentMember(dept.id, memberId);
    await loadDepartmentMembers();
    toast.info("Member removed from department");
  };

  const openQuickSms = (config: { recipientType: "individual" | "department"; recipientId?: string; recipientLabel?: string }) => {
    setQuickSmsConfig(config);
    setQuickSmsOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading department...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  if (!dept) return <div className="p-8 text-center text-muted-foreground">Department not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate(`/membership?tab=${searchParams.get("from") ?? "departments"}`)}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Membership
        </Button>
        <div className="flex flex-wrap gap-2">
          {has("SMS_SEND") && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openQuickSms({ recipientType: "department", recipientId: dept.id, recipientLabel: `All members in ${dept.name}` })}
            >
              <MessageSquare className="h-4 w-4" /> Send to all
            </Button>
          )}
          {has("DEPT_MEMBER_ADD") && (
            <Button className="gap-2" onClick={() => setIsAddToDeptOpen(true)}>
              <Plus className="h-4 w-4" /> Add member
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{dept.name}</h1>
              <Badge variant="secondary" className={dept.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                {dept.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">Led by {dept.leader} · {filtered.length} members</p>
          </div>
        </div>

        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search department members..."
          filters={
            <SearchableSelect
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
              placeholder="Role"
              searchPlaceholder="Search roles..."
              triggerClassName="w-[160px]"
              items={[
                { value: "all", label: "All Roles" },
              ...departmentRoles.map((role) => ({ value: role, label: role })),
              ]}
            />
          }
        />

        <div className="rounded-lg border overflow-x-auto">
          {departmentMembersLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading department members...</div>
          ) : departmentMembersError ? (
            <div className="p-8 text-center text-destructive">Failed to load members: {departmentMembersError}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(({ member, role }) => (
                  <TableRow key={member.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{role}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell><StatusBadge status={member.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {has("READ_ALL") && (
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${member.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {has("MEMBER_UPDATE") && (
                          <Button variant="ghost" size="icon" onClick={() => setEditingMemberId(member.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {has("SMS_SEND") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openQuickSms({ recipientType: "individual", recipientId: member.id, recipientLabel: `To ${member.name}` })}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {has("DEPT_MEMBER_REMOVE") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemberFromDepartment(member.id, member.name)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No matching members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Audit</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Created by</span>
            <span>{dept?.audit?.createdBy ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Created at</span>
            <span>{dept?.audit?.createdAt ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last edited by</span>
            <span>{dept?.audit?.lastEditedBy ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last edited at</span>
            <span>{dept?.audit?.lastEditedAt ?? "-"}</span>
          </div>
        </div>
      </div>

      <MemberFormDialog
        open={Boolean(editingMember)}
        onOpenChange={(open) => !open && setEditingMemberId(null)}
        title="Edit member"
        departments={allDepartments.map((d) => d.name)}
        roles={departmentRoles}
        defaultValues={editingMember ? {
          name: editingMember.name,
          email: editingMember.email,
          phone: editingMember.phone,
          gender: editingMember.gender,
          department: editingMember.department,
          role: editingMember.role,
          status: editingMember.status,
        } : undefined}
        onSubmit={async (values) => {
          const ok = await confirm({
            title: "Save changes",
            description: `Update details for ${values.name}?`,
            confirmText: "Save",
          });
          if (!ok) return;
          if (editingMember) {
            await updateMember(editingMember.id, {
              name: values.name,
              email: values.email,
              phone: values.phone,
              gender: values.gender,
              status: values.status,
            });
          }
          toast.success("Member updated successfully");
          setEditingMemberId(null);
        }}
      />
      <Dialog open={isAddToDeptOpen} onOpenChange={setIsAddToDeptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Select a member and role to add to this department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Member</Label>
              <SearchableSelect
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="Select member"
                searchPlaceholder="Search members..."
                items={memberOptions}
                onSearch={handleMemberLookup}
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <SearchableSelect
                value={selectedRole}
                onChange={setSelectedRole}
                placeholder="Select role"
                searchPlaceholder="Search roles..."
                items={departmentRoles.map((role) => ({ value: role, label: role }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToDeptOpen(false)}>Close</Button>
            <Button onClick={addMemberToDepartment}>Add member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {quickSmsConfig && (
        <SmsQuickSendDialog
          open={quickSmsOpen}
          onOpenChange={setQuickSmsOpen}
          recipientType={quickSmsConfig.recipientType}
          recipientId={quickSmsConfig.recipientId}
          recipientLabel={quickSmsConfig.recipientLabel}
        />
      )}
    </div>
  );
};

export default DepartmentPage;
