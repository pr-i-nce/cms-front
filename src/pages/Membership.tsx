import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, MessageSquare, UserMinus, Users, ArrowUpDown, Plus, UserPlus, ShieldOff } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { toast } from "sonner";
import MemberFormDialog from "@/components/shared/MemberFormDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { ApiMeta } from "@/lib/api";
import { listMembers, createMember, updateMember, deleteMember, listPastors, lookupMembers } from "@/api/members";
import { listDepartments, listDepartmentMembers, deactivateDepartment, createDepartment, addDepartmentMember, removeDepartmentMember, listDepartmentRoles, listDepartmentHeads } from "@/api/departments";
import { listCommittees, listCommitteeMembers, deactivateCommittee, createCommittee, listCommitteeChairs } from "@/api/committees";
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

type Committee = {
  id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  audit?: AuditFields;
};

type DepartmentMember = { departmentId: string; memberId: string; role: string; memberName?: string; memberEmail?: string; memberPhone?: string };
type CommitteeMember = { committeeId: string; memberId: string; role: string };
type DepartmentHead = { departmentId: string; departmentName: string; memberId: string; memberName: string; role: string };
type CommitteeChair = { committeeId: string; committeeName: string; memberId: string; memberName: string; role: string };

const PAGE_SIZE = 10;

const Membership = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { has } = usePermissions();
  const canSeeMembers = has("READ_ALL");
  const canSeeCommittees = has("READ_ALL") || has("COMMITTEE_UPDATE");
  const canSeePastors = has("READ_ALL");
  const canSeeDepartments = has("DEPARTMENT_UPDATE") || has("DEPARTMENT_CREATE");

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "members");
  const [leadersTab, setLeadersTab] = useState("department-heads");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [quickSmsConfig, setQuickSmsConfig] = useState<{ recipientType: "individual" | "selected" | "department" | "committee" | "all"; recipientId?: string; recipientIds?: string[]; recipientLabel?: string } | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [departmentHeads, setDepartmentHeads] = useState<DepartmentHead[]>([]);
  const [committeeChairs, setCommitteeChairs] = useState<CommitteeChair[]>([]);
  const [pastors, setPastors] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersMeta, setMembersMeta] = useState<ApiMeta["pagination"] | null>(null);
  const [manageDeptId, setManageDeptId] = useState<string | null>(null);

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });

  const [isAddCommitteeOpen, setIsAddCommitteeOpen] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({ name: "", description: "" });

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([]);
  const [memberLookupOptions, setMemberLookupOptions] = useState<{ value: string; label: string; keywords?: string[] }[]>([]);

  const activeMembers = canSeeMembers ? allMembers.filter((m) => m.status === "Active").length : 0;
  const latestJoinMonth = canSeeMembers
    ? allMembers.reduce((max, m) => (m.dateJoined > max ? m.dateJoined : max), "0000-00-00").slice(0, 7)
    : "0000-00-00";
  const newMembersThisMonth = canSeeMembers ? allMembers.filter((m) => m.dateJoined.startsWith(latestJoinMonth)).length : 0;

  const departmentById = useMemo(() => Object.fromEntries(departments.map((d) => [d.id, d])), [departments]);
  const committeeById = useMemo(() => Object.fromEntries(committees.map((c) => [c.id, c])), [committees]);

  const memberDepartmentIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    departmentMembers.forEach((entry) => {
      map[entry.memberId] = map[entry.memberId] ? [...map[entry.memberId], entry.departmentId] : [entry.departmentId];
    });
    return map;
  }, [departmentMembers]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  useEffect(() => {
    const allowedTabs = [
      canSeeMembers ? "members" : null,
      canSeeDepartments ? "departments" : null,
      canSeeCommittees ? "committees" : null,
      canSeeDepartments || canSeeCommittees ? "leaders" : null,
      canSeePastors ? "pastors" : null,
    ].filter(Boolean) as string[];
    const fallbackTab = allowedTabs[0] ?? "departments";
    const tab = searchParams.get("tab") ?? fallbackTab;
    if (!allowedTabs.includes(tab)) {
      setActiveTab(fallbackTab);
      setSearchParams({ tab: fallbackTab });
      return;
    }
    if (tab !== activeTab) setActiveTab(tab);
  }, [searchParams, activeTab, canSeeMembers, canSeeDepartments, canSeeCommittees, canSeePastors, setSearchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleLoadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      if (!canSeeMembers) {
        setMembers([]);
        setMembersMeta(null);
        return;
      }
      const res = await listMembers({
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        sort: `${sortField},${sortDir}`,
      });
      setMembers(res.data);
      setMembersMeta(res.meta?.pagination ?? null);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [page, search, sortField, sortDir, canSeeMembers]);

  const reloadMembers = handleLoadMembers;

  useEffect(() => {
    handleLoadMembers();
  }, [handleLoadMembers]);

  const reloadDepartments = async () => {
    const res = await listDepartments({ page: 1, pageSize: 200 });
    setDepartments(res.data);
    return res.data;
  };

  const reloadCommittees = async () => {
    const res = await listCommittees({ page: 1, pageSize: 200 });
    setCommittees(res.data);
    return res.data;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [departmentsRes, rolesRes, deptHeadsRes] = await Promise.all([
          listDepartments({ page: 1, pageSize: 200 }),
          listDepartmentRoles(),
          listDepartmentHeads(),
        ]);
        if (canSeeMembers) {
          const allMembersRes = await listMembers({ page: 1, pageSize: 500 });
          setAllMembers(allMembersRes.data);
        } else {
          setAllMembers([]);
        }
        setDepartments(departmentsRes.data);
        if (canSeeCommittees) {
          const committeesRes = await listCommittees({ page: 1, pageSize: 200 });
          setCommittees(committeesRes.data);
        } else {
          setCommittees([]);
        }
        setDepartmentRoles(rolesRes.data.length ? rolesRes.data : ["Member"]);
        setDepartmentHeads(deptHeadsRes.data);
        if (canSeeCommittees) {
          const committeeChairsRes = await listCommitteeChairs();
          setCommitteeChairs(committeeChairsRes.data);
        } else {
          setCommitteeChairs([]);
        }
        if (canSeePastors) {
          const pastorsRes = await listPastors();
          setPastors(pastorsRes.data);
        } else {
          setPastors([]);
        }

        const deptMembers = await Promise.all(
          departmentsRes.data.map((dept) =>
            listDepartmentMembers(dept.id, { page: 1, pageSize: 500 }),
          ),
        );
        setDepartmentMembers(
          deptMembers.flatMap((res, index) =>
            res.data.map((entry) => ({
              departmentId: departmentsRes.data[index].id,
              memberId: entry.memberId,
              role: entry.role,
              memberName: entry.member?.name,
              memberEmail: entry.member?.email,
              memberPhone: entry.member?.phone,
            })),
          ),
        );
        if (canSeeCommittees) {
          const committeesRes = await listCommittees({ page: 1, pageSize: 200 });
          const committeeMembersRes = await Promise.all(
            committeesRes.data.map((committee) =>
              listCommitteeMembers(committee.id, { page: 1, pageSize: 500 }),
            ),
          );
          setCommitteeMembers(
            committeeMembersRes.flatMap((res, index) =>
              res.data.map((entry) => ({
                committeeId: committeesRes.data[index].id,
                memberId: entry.memberId,
                role: entry.role,
              })),
            ),
          );
        } else {
          setCommitteeMembers([]);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canSeeMembers, canSeeCommittees, canSeePastors]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
      const departmentsForMember = memberDepartmentIds[m.id] ?? [];
      const matchDept = deptFilter === "all" || departmentsForMember.includes(deptFilter);
      const matchRole = roleFilter === "all" || m.role === roleFilter;
      return matchSearch && matchDept && matchRole;
    });
  }, [members, search, deptFilter, roleFilter, memberDepartmentIds]);

  const totalPages = membersMeta?.totalPages ?? 1;
  const totalItems = membersMeta?.total ?? filteredMembers.length;
  const paginatedMembers = filteredMembers;
  const editingMember = editingMemberId ? members.find((m) => m.id === editingMemberId) : null;
  const memberOptions = useMemo(
    () =>
      allMembers.map((member) => ({
        value: member.id,
        label: member.name,
        keywords: [member.phone, member.email],
      })),
    [allMembers],
  );

  const handleCreateMember = async (values: {
    name: string;
    email: string;
    phone: string;
    gender: string;
    department: string;
    role: string;
    status: "Active" | "Inactive";
  }) => {
    const ok = await confirm({
      title: "Create member",
      description: `Add ${values.name || "this member"} to the directory?`,
      confirmText: "Create",
    });
    if (!ok) return;
    await createMember({
      name: values.name,
      email: values.email,
      phone: values.phone,
      gender: values.gender,
      status: values.status,
    });
    await reloadMembers();
    toast.success("Member created successfully");
    setIsAddOpen(false);
  };

  const handleEditMember = async (values: {
    name: string;
    email: string;
    phone: string;
    gender: string;
    department: string;
    role: string;
    status: "Active" | "Inactive";
  }) => {
    const ok = await confirm({
      title: "Save changes",
      description: `Update details for ${values.name || "this member"}?`,
      confirmText: "Save",
    });
    if (!ok) return;
    if (editingMemberId) {
      await updateMember(editingMemberId, {
        name: values.name,
        email: values.email,
        phone: values.phone,
        gender: values.gender,
        status: values.status,
      });
      await reloadMembers();
    }
    toast.success("Member updated successfully");
    setEditingMemberId(null);
  };

  const handleDeactivate = async (memberId: string, memberName: string) => {
    const ok = await confirm({
      title: "Deactivate member",
      description: `Deactivate ${memberName}? They will no longer appear as active.`,
      confirmText: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    await deleteMember(memberId);
    await reloadMembers();
    toast.info("Member deactivated");
  };

  const handleDeactivateDepartment = async (deptId: string) => {
    const dept = departmentById[deptId];
    const ok = await confirm({
      title: "Deactivate department",
      description: `Deactivate ${dept?.name}?`,
      confirmText: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    await deactivateDepartment(deptId);
    await reloadDepartments();
    toast.info("Department deactivated");
  };

  const handleDeactivateCommittee = async (committeeId: string) => {
    const committee = committeeById[committeeId];
    const ok = await confirm({
      title: "Deactivate committee",
      description: `Deactivate ${committee?.name}?`,
      confirmText: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    await deactivateCommittee(committeeId);
    await reloadCommittees();
    toast.info("Committee deactivated");
  };

  const handleAddDepartment = async () => {
    const ok = await confirm({
      title: "Create department",
      description: "Add this department?",
      confirmText: "Create",
    });
    if (!ok) return;
    await createDepartment({ name: deptForm.name, description: deptForm.description });
    await reloadDepartments();
    setDeptForm({ name: "", description: "" });
    setIsAddDeptOpen(false);
    toast.success("Department created");
  };

  const handleAddCommittee = async () => {
    const ok = await confirm({
      title: "Create committee",
      description: "Add this committee?",
      confirmText: "Create",
    });
    if (!ok) return;
    await createCommittee({ name: committeeForm.name, description: committeeForm.description });
    await reloadCommittees();
    setCommitteeForm({ name: "", description: "" });
    setIsAddCommitteeOpen(false);
    toast.success("Committee created");
  };

  const addMemberToDepartment = async () => {
    if (!manageDeptId || !selectedMemberId) return;
    await addDepartmentMember(manageDeptId, {
      memberId: selectedMemberId,
      role: selectedRole,
    });
    const deptMembers = await listDepartmentMembers(manageDeptId, { page: 1, pageSize: 500 });
    setDepartmentMembers((prev) => [
      ...prev.filter((entry) => entry.departmentId !== manageDeptId),
      ...deptMembers.data.map((entry) => ({
        departmentId: manageDeptId,
        memberId: entry.memberId,
        role: entry.role,
        memberName: entry.member?.name,
        memberEmail: entry.member?.email,
        memberPhone: entry.member?.phone,
      })),
    ]);
  };

  const removeMemberFromDepartment = async (memberId: string) => {
    if (!manageDeptId) return;
    await removeDepartmentMember(manageDeptId, memberId);
    setDepartmentMembers((prev) => prev.filter((entry) => !(entry.departmentId === manageDeptId && entry.memberId === memberId)));
  };

  const handleMemberLookup = useCallback(
    async (value: string) => {
      if (canSeeMembers) return;
      if (!value || value.trim().length < 2) {
        setMemberLookupOptions([]);
        return;
      }
      try {
        const res = await lookupMembers(value.trim());
        setMemberLookupOptions(
          res.data.map((member) => ({
            value: member.id,
            label: member.name,
            keywords: [member.phone, member.email],
          })),
        );
      } catch (err) {
        setMemberLookupOptions([]);
      }
    },
    [canSeeMembers],
  );


  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  );

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading membership data...</div>;
  }

  if (loadError) {
    return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membership</h1>
          <p className="text-muted-foreground">Manage church members, departments, and committees</p>
        </div>
        {has("MEMBER_CREATE") && (
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <Users className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      {canSeeMembers ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total members</p>
            <p className="text-2xl font-semibold">{membersMeta?.total ?? allMembers.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">{activeMembers}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">New this month</p>
            <p className="text-2xl font-semibold">{newMembersThisMonth}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Member statistics are restricted for your role.
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          {canSeeMembers && <TabsTrigger value="members">All Members</TabsTrigger>}
          {canSeeDepartments && <TabsTrigger value="departments">Departments</TabsTrigger>}
          {canSeeCommittees && <TabsTrigger value="committees">Committees</TabsTrigger>}
          {(canSeeDepartments || canSeeCommittees) && <TabsTrigger value="leaders">Leaders Heads</TabsTrigger>}
          {canSeePastors && <TabsTrigger value="pastors">Pastors</TabsTrigger>}
        </TabsList>

      {canSeeMembers && (
      <TabsContent value="members" className="space-y-4">
          <div className="bg-card rounded-lg border p-5">
            {has("SMS_SEND") && (
              <div className="flex justify-end mb-3">
                <Button variant="outline" size="sm" onClick={() => openQuickSms({ recipientType: "all", recipientLabel: "All members" })}>
                  <MessageSquare className="h-4 w-4 mr-2" /> Send to all members
                </Button>
              </div>
            )}
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search members..."
              filters={
                <>
                  <SearchableSelect
                    value={deptFilter}
                    onChange={(v) => { setDeptFilter(v); setPage(1); }}
                    placeholder="Department"
                    searchPlaceholder="Search departments..."
                    triggerClassName="w-[180px]"
                    items={[
                      { value: "all", label: "All Departments" },
                      ...departments.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                  <SearchableSelect
                    value={roleFilter}
                    onChange={(v) => { setRoleFilter(v); setPage(1); }}
                    placeholder="Role"
                    searchPlaceholder="Search roles..."
                    triggerClassName="w-[160px]"
                    items={[
                      { value: "all", label: "All Roles" },
                      ...departmentRoles.map((r) => ({ value: r, label: r })),
                    ]}
                  />
                </>
              }
            />

            <div className="rounded-lg border overflow-x-auto">
              {membersLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading members...</div>
              ) : membersError ? (
                <div className="p-8 text-center text-destructive">Failed to load members: {membersError}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader field="name">Name</SortHeader>
                      <TableHead>Phone</TableHead>
                      <SortHeader field="department">Departments</SortHeader>
                      <SortHeader field="role">Role</SortHeader>
                      <SortHeader field="status">Status</SortHeader>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => {
                      const deptNames = (memberDepartmentIds[m.id] ?? []).map((id) => departmentById[id]?.name ?? "").filter(Boolean);
                      return (
                        <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>{m.phone}</TableCell>
                          <TableCell>
                            {deptNames.length > 0 ? deptNames.join(", ") : "—"}
                          </TableCell>
                          <TableCell>{m.role}</TableCell>
                          <TableCell><StatusBadge status={m.status} /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${m.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {has("MEMBER_UPDATE") && (
                                <Button variant="ghost" size="icon" onClick={() => setEditingMemberId(m.id)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {has("SMS_SEND") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openQuickSms({ recipientType: "individual", recipientId: m.id, recipientLabel: `To ${m.name}` })}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                              {has("MEMBER_DELETE") && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeactivate(m.id, m.name)}>
                                  <UserMinus className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No members match the current filters.
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
      </TabsContent>
      )}

        {canSeeDepartments && (
        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Departments</h2>
              <p className="text-sm text-muted-foreground">Manage departments and assign members.</p>
            </div>
            {has("DEPARTMENT_CREATE") && (
              <Button className="gap-2" onClick={() => setIsAddDeptOpen(true)}>
                <Plus className="h-4 w-4" /> Add Department
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, i) => {
              const memberCount = departmentMembers.filter((entry) => entry.departmentId === dept.id).length;
              return (
                <div
                  key={dept.id}
                  className="bg-card rounded-lg border p-5 hover:shadow-md transition-shadow animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{memberCount}</span>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{dept.name}</h3>
                    <Badge variant="secondary" className={dept.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                      {dept.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Led by {dept.leader}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/membership/department/${dept.id}?from=departments`)}>
                      View
                    </Button>
                    {(has("DEPT_MEMBER_ADD") || has("DEPT_MEMBER_REMOVE")) && (
                      <Button variant="ghost" size="sm" onClick={() => setManageDeptId(dept.id)}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Members
                      </Button>
                    )}
                    {has("DEPARTMENT_DEACTIVATE") && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeactivateDepartment(dept.id)}>
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        )}

        {canSeeCommittees && (
        <TabsContent value="committees" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Committees</h2>
              <p className="text-sm text-muted-foreground">Assign members and roles to committees.</p>
            </div>
            {has("COMMITTEE_CREATE") && (
              <Button className="gap-2" onClick={() => setIsAddCommitteeOpen(true)}>
                <Plus className="h-4 w-4" /> Add Committee
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {committees.map((committee, i) => {
              const memberCount = committeeMembers.filter((entry) => entry.committeeId === committee.id).length;
              return (
                <div
                  key={committee.id}
                  className="bg-card rounded-lg border p-5 hover:shadow-md transition-shadow animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${i * 80}ms` }}
                  onClick={() => navigate(`/membership/committee/${committee.id}?from=committees`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{memberCount}</span>
                      <p className="text-xs text-muted-foreground">Members</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{committee.name}</h3>
                    <Badge variant="secondary" className={committee.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                      {committee.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{committee.description}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/membership/committee/${committee.id}?from=committees`);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Members
                    </Button>
                    {has("COMMITTEE_DEACTIVATE") && (
                      <Button variant="ghost" size="sm" onClick={() => handleDeactivateCommittee(committee.id)}>
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        )}

        {(canSeeDepartments || canSeeCommittees) && (
        <TabsContent value="leaders" className="space-y-4">
          <div className="bg-card rounded-lg border p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
              <h2 className="text-lg font-semibold">Leaders & Heads</h2>
              <p className="text-sm text-muted-foreground">Department heads and committee chairs.</p>
              </div>
              {has("SMS_SEND") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ids = Array.from(
                      new Set([
                        ...departmentHeads.map((entry) => entry.memberId),
                        ...committeeChairs.map((entry) => entry.memberId),
                      ]),
                    );
                    openQuickSms({ recipientType: "selected", recipientIds: ids, recipientLabel: "All leaders & heads" });
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> Send to all leaders
                </Button>
              )}
            </div>
            <Tabs value={leadersTab} onValueChange={setLeadersTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="department-heads">Department Heads</TabsTrigger>
                {canSeeCommittees && <TabsTrigger value="committee-chairs">Committee Chairs</TabsTrigger>}
              </TabsList>
              <TabsContent value="department-heads">
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentHeads.map((entry) => (
                        <TableRow key={`${entry.departmentId}-${entry.memberId}`}>
                          <TableCell className="font-medium">{entry.memberName}</TableCell>
                          <TableCell>{entry.role}</TableCell>
                          <TableCell>{entry.departmentName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${entry.memberId}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/membership/department/${entry.departmentId}?from=departments`)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              {has("SMS_SEND") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openQuickSms({ recipientType: "individual", recipientId: entry.memberId, recipientLabel: `To ${entry.memberName}` })}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {departmentHeads.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No department heads assigned.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              {canSeeCommittees && (
              <TabsContent value="committee-chairs">
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Committee</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {committeeChairs.map((entry) => (
                        <TableRow key={`${entry.committeeId}-${entry.memberId}`}>
                          <TableCell className="font-medium">{entry.memberName}</TableCell>
                          <TableCell>{entry.role}</TableCell>
                          <TableCell>{entry.committeeName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${entry.memberId}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/membership/committee/${entry.committeeId}?from=committees`)}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              {has("SMS_SEND") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openQuickSms({ recipientType: "individual", recipientId: entry.memberId, recipientLabel: `To ${entry.memberName}` })}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {committeeChairs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No committee chairs assigned.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              )}
            </Tabs>
          </div>
        </TabsContent>
        )}

        {canSeePastors && (
        <TabsContent value="pastors" className="space-y-4">
          <div className="bg-card rounded-lg border p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
              <h2 className="text-lg font-semibold">Pastors</h2>
              <p className="text-sm text-muted-foreground">Pastoral team and roles.</p>
              </div>
              {has("SMS_SEND") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ids = Array.from(new Set(pastors.map((pastor) => pastor.id)));
                    openQuickSms({ recipientType: "selected", recipientIds: ids, recipientLabel: "All pastors" });
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" /> Send to all pastors
                </Button>
              )}
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastors.map((pastor) => (
                    <TableRow key={pastor.id}>
                      <TableCell className="font-medium">{pastor.name}</TableCell>
                      <TableCell>{pastor.role}</TableCell>
                      <TableCell>{pastor.phone}</TableCell>
                      <TableCell>{pastor.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${pastor.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {has("SMS_SEND") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openQuickSms({ recipientType: "individual", recipientId: pastor.id, recipientLabel: `To ${pastor.name}` })}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pastors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No pastors found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        )}
      </Tabs>

      <MemberFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add member"
        departments={departments.map((d) => d.name)}
        roles={departmentRoles}
        onSubmit={handleCreateMember}
      />
      <MemberFormDialog
        open={Boolean(editingMember)}
        onOpenChange={(open) => !open && setEditingMemberId(null)}
        title="Edit member"
        departments={departments.map((d) => d.name)}
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
        onSubmit={handleEditMember}
      />

      <Dialog open={Boolean(manageDeptId)} onOpenChange={(open) => !open && setManageDeptId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div>
              <DialogTitle>Department members</DialogTitle>
              <DialogDescription>Add members and assign roles.</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Member</Label>
                <SearchableSelect
                  value={selectedMemberId}
                  onChange={setSelectedMemberId}
                  placeholder="Select member"
                  searchPlaceholder="Search members..."
                  items={canSeeMembers ? memberOptions : memberLookupOptions}
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
            {has("DEPT_MEMBER_ADD") && (
              <Button variant="outline" onClick={addMemberToDepartment} className="gap-2">
                <Plus className="h-4 w-4" /> Add member
              </Button>
            )}

            <div className="space-y-2">
              {departmentMembers
                .filter((entry) => entry.departmentId === manageDeptId)
                .map((entry) => {
                  const member = members.find((m) => m.id === entry.memberId);
                  return (
                    <div key={entry.memberId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{member?.name ?? entry.memberName ?? "Member"}</p>
                        <p className="text-xs text-muted-foreground">{entry.role}</p>
                      </div>
                      {has("DEPT_MEMBER_REMOVE") && (
                        <Button variant="ghost" size="sm" onClick={() => removeMemberFromDepartment(entry.memberId)}>
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              {departmentMembers.filter((entry) => entry.departmentId === manageDeptId).length === 0 && (
                <p className="text-sm text-muted-foreground">No members assigned.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDeptId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add department</DialogTitle>
            <DialogDescription>Create a new department.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={deptForm.name} onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={deptForm.description} onChange={(e) => setDeptForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDeptOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDepartment}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCommitteeOpen} onOpenChange={setIsAddCommitteeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add committee</DialogTitle>
            <DialogDescription>Create a new committee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={committeeForm.name} onChange={(e) => setCommitteeForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={committeeForm.description} onChange={(e) => setCommitteeForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCommitteeOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCommittee}>Create</Button>
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

export default Membership;
  const openQuickSms = (config: { recipientType: "individual" | "selected" | "department" | "committee" | "all"; recipientId?: string; recipientIds?: string[]; recipientLabel?: string }) => {
    setQuickSmsConfig(config);
    setQuickSmsOpen(true);
  };
