import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, MessageSquare, Pencil, Plus, UserMinus, Users } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SearchableSelect from "@/components/shared/SearchableSelect";
import MemberFormDialog from "@/components/shared/MemberFormDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { toast } from "sonner";
import { ApiMeta } from "@/lib/api";
import { listMembers, lookupMembers, updateMember } from "@/api/members";
import { listDepartments, listDepartmentRoles } from "@/api/departments";
import { getCommittee, listCommitteeMembers, addCommitteeMember, removeCommitteeMember, listCommitteeRoles } from "@/api/committees";
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

type Committee = {
  id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  audit?: AuditFields;
};

type CommitteeMember = { committeeId: string; memberId: string; role: string; member?: Member };

const PAGE_SIZE = 10;
const normalizeCommitteeRole = (role: string) => (role === "Leader" ? "Chair" : role);

const CommitteePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const [committee, setCommittee] = useState<Committee | null>(null);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [allDepartments, setAllDepartments] = useState<{ id: string; name: string }[]>([]);
  const [committeeMembersMeta, setCommitteeMembersMeta] = useState<ApiMeta["pagination"] | null>(null);
  const [committeeMembersLoading, setCommitteeMembersLoading] = useState(false);
  const [committeeMembersError, setCommitteeMembersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { has } = usePermissions();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [quickSmsConfig, setQuickSmsConfig] = useState<{ recipientType: "individual" | "committee"; recipientId?: string; recipientLabel?: string } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [committeeRoles, setCommitteeRoles] = useState<string[]>([]);
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([]);
  const canAccessCommittees = has("COMMITTEE_UPDATE") || has("COMMITTEE_MEMBER_ADD") || has("COMMITTEE_MEMBER_REMOVE") || has("READ_ALL");

  const memberOptions = useMemo(
    () =>
      allMembers.map((member) => ({
        value: member.id,
        label: member.name,
        keywords: [member.phone, member.email],
      })),
    [allMembers],
  );

  const committeeMemberEntries = useMemo(() => {
    if (!committee) return [];
    return committeeMembers.filter((entry) => entry.committeeId === committee.id);
  }, [committee, committeeMembers]);

  const members = useMemo(() => {
    return committeeMemberEntries
      .map((entry) => {
        if (!entry.member) return null;
        return { member: entry.member, role: normalizeCommitteeRole(entry.role) };
      })
      .filter((item) => item !== null) as { member: Member; role: string }[];
  }, [committeeMemberEntries]);

  const filtered = useMemo(() => members, [members]);

  const totalPages = committeeMembersMeta?.totalPages ?? 1;
  const totalItems = committeeMembersMeta?.total ?? filtered.length;
  const paginated = filtered;
  const editingMember = editingMemberId
    ? members.find((entry) => entry.member.id === editingMemberId)?.member ?? allMembers.find((m) => m.id === editingMemberId) ?? null
    : null;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      if (!canAccessCommittees) {
        setLoading(false);
        setLoadError(null);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [committeeRes, allDepartmentsRes, committeeRolesRes, departmentRolesRes] = await Promise.all([
          getCommittee(id),
          listDepartments({ page: 1, pageSize: 200 }),
          listCommitteeRoles(),
          listDepartmentRoles(),
        ]);
        const rawCommittee = committeeRes.data.committee;
        setCommittee(rawCommittee ? {
          ...rawCommittee,
          audit: {
            createdBy: rawCommittee.createdBy ?? "System",
            createdAt: rawCommittee.createdAt ?? "-",
            lastEditedBy: rawCommittee.lastEditedBy ?? "System",
            lastEditedAt: rawCommittee.lastEditedAt ?? "-",
            sentBy: rawCommittee.sentBy ?? undefined,
          },
        } : null);
        if (has("READ_ALL")) {
          const allMembersRes = await listMembers({ page: 1, pageSize: 500 });
          setAllMembers(allMembersRes.data);
        } else {
          setAllMembers([]);
        }
        setAllDepartments(allDepartmentsRes.data);
        setCommitteeRoles(committeeRolesRes.data.length ? committeeRolesRes.data : ["Member"]);
        setDepartmentRoles(departmentRolesRes.data.length ? departmentRolesRes.data : ["Member"]);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, canAccessCommittees, has]);

  if (!canAccessCommittees) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You do not have access to committee details.
      </div>
    );
  }

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

  const loadCommitteeMembers = useCallback(async () => {
    if (!committee) return;
    setCommitteeMembersLoading(true);
    setCommitteeMembersError(null);
    try {
      const res = await listCommitteeMembers(committee.id, {
        page,
        pageSize: PAGE_SIZE,
        q: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      });
      setCommitteeMembers(
        res.data.map((entry) => ({
          committeeId: committee.id,
          memberId: entry.memberId,
          role: entry.role,
          member: entry.member,
        })),
      );
      setCommitteeMembersMeta(res.meta?.pagination ?? null);
    } catch (err) {
      setCommitteeMembersError(err instanceof Error ? err.message : "Failed to load committee members");
    } finally {
      setCommitteeMembersLoading(false);
    }
  }, [committee, page, search, roleFilter]);

  useEffect(() => {
    loadCommitteeMembers();
  }, [loadCommitteeMembers]);

  useEffect(() => {
    setPage(1);
  }, [committee?.id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading committee...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  if (!committee) return <div className="p-8 text-center text-muted-foreground">Committee not found</div>;

  const addMemberToCommittee = async () => {
    if (!selectedMemberId) return;
    const member = allMembers.find((m) => m.id === selectedMemberId);
    const ok = await confirm({
      title: "Add to committee",
      description: `Add ${member?.name || "this member"} to ${committee.name}?`,
      confirmText: "Add",
    });
    if (!ok) return;
    await addCommitteeMember(committee.id, { memberId: selectedMemberId, role: selectedRole });
    await loadCommitteeMembers();
    setSelectedMemberId("");
    setSelectedRole("Member");
    toast.success("Member added to committee");
  };

  const removeMemberFromCommittee = async (memberId: string, memberName?: string) => {
    const ok = await confirm({
      title: "Remove member",
      description: `Remove ${memberName || "this member"} from ${committee.name}?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    await removeCommitteeMember(committee.id, memberId);
    await loadCommitteeMembers();
    toast.info("Member removed from committee");
  };

  const openQuickSms = (config: { recipientType: "individual" | "committee"; recipientId?: string; recipientLabel?: string }) => {
    setQuickSmsConfig(config);
    setQuickSmsOpen(true);
  };

  const committeeAudit = committee?.audit ?? {
    createdBy: "-",
    createdAt: "-",
    lastEditedBy: "-",
    lastEditedAt: "-",
    sentBy: undefined,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate(`/membership?tab=${searchParams.get("from") ?? "committees"}`)}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Membership
        </Button>
        <div className="flex flex-wrap gap-2">
          {has("SMS_SEND") && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openQuickSms({ recipientType: "committee", recipientId: committee.id, recipientLabel: `All members in ${committee.name}` })}
            >
              <MessageSquare className="h-4 w-4" /> Send to all
            </Button>
          )}
          {has("COMMITTEE_MEMBER_ADD") && (
            <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
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
              <h1 className="text-2xl font-bold">{committee.name}</h1>
              <Badge variant="secondary" className={committee.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                {committee.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{committee.description} · {filtered.length} members</p>
          </div>
        </div>

        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search committee members..."
          filters={
            <SearchableSelect
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
              placeholder="Role"
              searchPlaceholder="Search roles..."
              triggerClassName="w-[160px]"
              items={[
                { value: "all", label: "All Roles" },
                ...committeeRoles.map((role) => ({ value: role, label: role })),
              ]}
            />
          }
        />

        <div className="rounded-lg border overflow-x-auto">
          {committeeMembersLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading committee members...</div>
          ) : committeeMembersError ? (
            <div className="p-8 text-center text-destructive">Failed to load members: {committeeMembersError}</div>
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
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/membership/member/${member.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
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
                        {has("COMMITTEE_MEMBER_REMOVE") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemberFromCommittee(member.id, member.name)}
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
                      No members found.
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
            <span>{committeeAudit.createdBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Created at</span>
            <span>{committeeAudit.createdAt}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last edited by</span>
            <span>{committeeAudit.lastEditedBy}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last edited at</span>
            <span>{committeeAudit.lastEditedAt}</span>
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Select a member and role to add to this committee.</DialogDescription>
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
                items={committeeRoles.map((role) => ({ value: role, label: role }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Close</Button>
            <Button onClick={addMemberToCommittee}>Add member</Button>
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

export default CommitteePage;
