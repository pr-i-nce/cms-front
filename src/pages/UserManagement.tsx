import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, UserMinus, KeyRound, Plus, Users, Shield, Eye } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import UserFormDialog from "@/components/shared/UserFormDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { toast } from "sonner";
import { listUsers, createUser, updateUser, deactivateUser, resetUserPassword, getUserGroups, assignUserGroups } from "@/api/users";
import { listGroups, createGroup, updateGroup, getGroupRoles, assignGroupRoles } from "@/api/groups";
import { listRoles, getRolePermissions } from "@/api/roles";
import { listPermissions } from "@/api/permissions";
import { listDepartmentHeads } from "@/api/departments";
import { listCommitteeChairs } from "@/api/committees";
import { usePermissions } from "@/lib/permissions";

type AuditFields = {
  createdBy: string;
  createdAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
};

type SystemUser = {
  id: string;
  name: string;
  role?: string;
  email: string;
  phone?: string;
  status: "Active" | "Inactive";
  audit?: AuditFields;
};

type Group = { id: string; name: string; description: string; audit?: AuditFields };
type Role = { id: string; name: string; description: string; audit?: AuditFields };
type Permission = { id: string; name: string; description: string; audit?: AuditFields };
type GroupRole = { groupId: string; roleId: string };
type UserGroup = { userId: string; groupId: string };
type RolePermission = { roleId: string; permissionId: string };

const PAGE_SIZE = 8;

const UserManagement = () => {
  const confirm = useConfirm();
  const { has } = usePermissions();
  const canAccessUsers = has("USER_CREATE") || has("USER_UPDATE") || has("USER_DEACTIVATE") || has("USER_ASSIGN_GROUPS") || has("USER_RESET_PASSWORD");

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [leaderOptions, setLeaderOptions] = useState<{ id: string; name: string; email?: string; phone?: string }[]>([]);
  const [groupRolesLinks, setGroupRolesLinks] = useState<GroupRole[]>([]);
  const [userGroupLinks, setUserGroupLinks] = useState<UserGroup[]>([]);
  const [rolePermissionLinks, setRolePermissionLinks] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [groupRoles, setGroupRoles] = useState<Record<string, string[]>>({});
  const [userGroups, setUserGroups] = useState<Record<string, string[]>>({});
  const rolePermissions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const link of rolePermissionLinks) {
      map[link.roleId] = map[link.roleId] ? [...map[link.roleId], link.permissionId] : [link.permissionId];
    }
    return map;
  }, [rolePermissionLinks]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [assignUserGroupsId, setAssignUserGroupsId] = useState<string | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [assignGroupRolesId, setAssignGroupRolesId] = useState<string | null>(null);
  const [viewGroupId, setViewGroupId] = useState<string | null>(null);

  const [groupForm, setGroupForm] = useState({ name: "", description: "" });

  const groupById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);
  const permissionById = useMemo(() => Object.fromEntries(permissions.map((p) => [p.id, p])), [permissions]);
  const roleOptions = useMemo(() => {
    const names = roles.map((r) => r.name);
    return names.includes("Leader") ? names : [...names, "Leader"];
  }, [roles]);

  const getGroupRoleIds = (groupId: string) => groupRoles[groupId] ?? [];
  const getRolePermissionIds = (roleId: string) => rolePermissions[roleId] ?? [];

  const getGroupPermissions = (groupId: string) => {
    const roleIds = getGroupRoleIds(groupId);
    const permissionIds = new Set<string>();
    roleIds.forEach((roleId) => {
      getRolePermissionIds(roleId).forEach((permId) => permissionIds.add(permId));
    });
    return Array.from(permissionIds);
  };

  const getUserPermissions = (userId: string) => {
    const groupIds = userGroups[userId] ?? [];
    const permissionIds = new Set<string>();
    groupIds.forEach((groupId) => {
      getGroupPermissions(groupId).forEach((permId) => permissionIds.add(permId));
    });
    return Array.from(permissionIds);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchGroup = groupFilter === "all" || (userGroups[u.id] ?? []).includes(groupFilter);
      return matchSearch && matchGroup;
    });
  }, [users, search, groupFilter, userGroups]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginated = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeUsers = users.filter((u) => u.status === "Active").length;
  const inactiveUsers = users.length - activeUsers;

  useEffect(() => {
    const load = async () => {
      if (!canAccessUsers) {
        setLoading(false);
        setLoadError(null);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [usersRes, groupsRes, rolesRes, permsRes] = await Promise.all([
          listUsers({ page: 1, pageSize: 500 }),
          listGroups(),
          has("ROLE_VIEW") ? listRoles() : Promise.resolve({ data: [] as Role[] }),
          has("PERMISSION_VIEW") ? listPermissions() : Promise.resolve({ data: [] as Permission[] }),
        ]);
        setUsers(usersRes.data);
        setGroups(groupsRes.data);
        setRoles(rolesRes.data);
        setPermissions(permsRes.data);

        const [deptHeadsRes, committeeChairsRes] = await Promise.all([
          has("DEPARTMENT_UPDATE") ? listDepartmentHeads() : Promise.resolve({ data: [] as any[] }),
          has("COMMITTEE_UPDATE") ? listCommitteeChairs() : Promise.resolve({ data: [] as any[] }),
        ]);
        const leaderMap = new Map<string, { id: string; name: string; email?: string; phone?: string }>();
        deptHeadsRes.data.forEach((head: any) => {
          leaderMap.set(head.memberId, { id: head.memberId, name: head.memberName });
        });
        committeeChairsRes.data.forEach((chair: any) => {
          if (!leaderMap.has(chair.memberId)) {
            leaderMap.set(chair.memberId, { id: chair.memberId, name: chair.memberName });
          }
        });
        setLeaderOptions(Array.from(leaderMap.values()));

        const groupRolesRes = await Promise.all(
          groupsRes.data.map((g) => getGroupRoles(g.id)),
        );
        const nextGroupRoles: Record<string, string[]> = {};
        groupRolesRes.forEach((res, i) => {
          nextGroupRoles[groupsRes.data[i].id] = res.data.roleIds;
        });
        setGroupRoles(nextGroupRoles);
        setGroupRolesLinks(
          groupsRes.data.flatMap((g, i) => (groupRolesRes[i].data.roleIds || []).map((roleId) => ({ groupId: g.id, roleId }))),
        );

        const userGroupsRes = await Promise.all(
          usersRes.data.map((u) => getUserGroups(u.id)),
        );
        const nextUserGroups: Record<string, string[]> = {};
        userGroupsRes.forEach((res, i) => {
          nextUserGroups[usersRes.data[i].id] = res.data.groupIds;
        });
        setUserGroups(nextUserGroups);
        setUserGroupLinks(
          usersRes.data.flatMap((u, i) => (userGroupsRes[i].data.groupIds || []).map((groupId) => ({ userId: u.id, groupId }))),
        );

        if (rolesRes.data.length) {
          const rolePermsRes = await Promise.all(
            rolesRes.data.map((r) => getRolePermissions(r.id)),
          );
          setRolePermissionLinks(
            rolesRes.data.flatMap((r, i) => (rolePermsRes[i].data.permissionIds || []).map((permissionId) => ({ roleId: r.id, permissionId }))),
          );
        } else {
          setRolePermissionLinks([]);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canAccessUsers, has]);

  if (!canAccessUsers) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You do not have access to user management.
      </div>
    );
  }

  const refreshUsersAndGroups = async () => {
    const usersRes = await listUsers({ page: 1, pageSize: 500 });
    setUsers(usersRes.data);
    const userGroupsRes = await Promise.all(
      usersRes.data.map((u) => getUserGroups(u.id)),
    );
    const nextUserGroups: Record<string, string[]> = {};
    userGroupsRes.forEach((res, i) => {
      nextUserGroups[usersRes.data[i].id] = res.data.groupIds;
    });
    setUserGroups(nextUserGroups);
  };

  const handleCreateUser = async (values: { name: string; email: string; phone: string; role: string; status: "Active" | "Inactive"; password?: string; memberId?: string; groupIds?: string[]; }) => {
    const ok = await confirm({
      title: "Create user",
      description: `Create an account for ${values.name || "this user"}?`,
      confirmText: "Create",
    });
    if (!ok) return;
    if (!values.password) {
      toast.error("Password is required");
      return;
    }
    const groupIds = values.groupIds ?? [];
    if (!groupIds.length) {
      toast.error("Select at least one group");
      return;
    }
    if (values.role.trim().toLowerCase() === "leader" && !values.memberId) {
      toast.error("Select a leader to create this account");
      return;
    }
    await createUser({ ...values, groupIds });
    await refreshUsersAndGroups();
    toast.success("User created successfully");
    setIsAddUserOpen(false);
  };

  const handleEditUser = async (values: { name: string; email: string; phone: string; role: string; status: "Active" | "Inactive"; password?: string; memberId?: string; groupIds?: string[]; }) => {
    const ok = await confirm({
      title: "Save changes",
      description: `Update account details for ${values.name || "this user"}?`,
      confirmText: "Save",
    });
    if (!ok) return;
    if (editingUserId) {
      const { memberId, groupIds, ...payload } = values;
      if (has("USER_ASSIGN_GROUPS")) {
        const nextGroupIds = groupIds ?? [];
        if (!nextGroupIds.length) {
          toast.error("Select at least one group");
          return;
        }
        await Promise.all([
          updateUser(editingUserId, payload),
          assignUserGroups(editingUserId, { groupIds: nextGroupIds }),
        ]);
      } else {
        await updateUser(editingUserId, payload);
      }
      await refreshUsersAndGroups();
    }
    toast.success("User updated successfully");
    setEditingUserId(null);
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: "Send password reset",
      description: `Send a password reset email to ${userName}?`,
      confirmText: "Send",
    });
    if (!ok) return;
    await resetUserPassword(userId);
    toast.info("Password reset sent");
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: "Deactivate user",
      description: `Deactivate ${userName}?`,
      confirmText: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    await deactivateUser(userId);
    const usersRes = await listUsers({ page: 1, pageSize: 500 });
    setUsers(usersRes.data);
    toast.info("User deactivated");
  };


  const editingUser = editingUserId ? users.find((u) => u.id === editingUserId) : null;
  const editingGroup = editingGroupId ? groups.find((g) => g.id === editingGroupId) : null;
  const viewingUser = viewUserId ? users.find((u) => u.id === viewUserId) : null;
  const viewingGroup = viewGroupId ? groups.find((g) => g.id === viewGroupId) : null;

  const openGroupForm = (groupId?: string) => {
    if (groupId) {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setGroupForm({ name: group.name, description: group.description });
        setEditingGroupId(group.id);
      }
    } else {
      setGroupForm({ name: "", description: "" });
      setIsAddGroupOpen(true);
    }
  };

  const handleSaveGroup = async (mode: "add" | "edit") => {
    const ok = await confirm({
      title: mode === "add" ? "Create group" : "Update group",
      description: "Save group changes?",
      confirmText: mode === "add" ? "Create" : "Save",
    });
    if (!ok) return;
    if (mode === "add") {
      await createGroup(groupForm);
      const groupsRes = await listGroups();
      setGroups(groupsRes.data);
      setIsAddGroupOpen(false);
      toast.success("Group created");
    } else if (editingGroup) {
      await updateGroup(editingGroup.id, groupForm);
      const groupsRes = await listGroups();
      setGroups(groupsRes.data);
      setEditingGroupId(null);
      toast.success("Group updated");
    }
  };

  const toggleSelection = (values: string[], value: string) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading user management...</div>;
  }

  if (loadError) {
    return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Users → Groups → Roles → Permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total users</p>
          <p className="text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-semibold">{activeUsers}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Groups</p>
          <p className="text-2xl font-semibold">{groups.length}</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          {has("ROLE_VIEW") && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {has("PERMISSION_VIEW") && <TabsTrigger value="permissions">Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search users..."
              filters={
                <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            {has("USER_CREATE") && (
              <Button className="gap-2" onClick={() => setIsAddUserOpen(true)}>
                <Plus className="h-4 w-4" /> Add User
              </Button>
            )}
          </div>

          <div className="bg-card rounded-lg border p-5">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(userGroups[u.id] ?? []).map((groupId) => (
                            <Badge key={groupId} variant="secondary" className="bg-primary/10 text-primary">
                              {groupById[groupId]?.name ?? "Unknown"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={u.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewUserId(u.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {has("USER_UPDATE") && (
                            <Button variant="ghost" size="icon" onClick={() => setEditingUserId(u.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {has("USER_ASSIGN_GROUPS") && (
                            <Button variant="ghost" size="icon" onClick={() => setAssignUserGroupsId(u.id)}>
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          {has("USER_RESET_PASSWORD") && (
                            <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u.id, u.name)}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          {has("USER_DEACTIVATE") && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeactivate(u.id, u.name)}>
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Groups</h2>
              <p className="text-sm text-muted-foreground">Attach roles to groups and assign users.</p>
            </div>
            {has("GROUP_CREATE") && (
              <Button className="gap-2" onClick={() => openGroupForm()}>
                <Plus className="h-4 w-4" /> Add Group
              </Button>
            )}
          </div>

          <div className="bg-card rounded-lg border p-5">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.description}</TableCell>
                      <TableCell>
                        {(Object.entries(userGroups).filter(([, groupIds]) => groupIds.includes(group.id)).length)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewGroupId(group.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {has("GROUP_UPDATE") && (
                            <Button variant="ghost" size="icon" onClick={() => openGroupForm(group.id)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {has("GROUP_ASSIGN_ROLES") && (
                            <Button variant="ghost" size="icon" onClick={() => setAssignGroupRolesId(group.id)}>
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Roles</h2>
            <p className="text-sm text-muted-foreground">Roles are fixed from system setup.</p>
          </div>

          <div className="bg-card rounded-lg border p-5">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getRolePermissionIds(role.id).map((permId) => (
                            <Badge key={permId} variant="secondary" className="bg-muted/70 text-muted-foreground">
                              {permissionById[permId]?.name ?? permId}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Permissions</h2>
            <p className="text-sm text-muted-foreground">Permissions are fixed from system setup.</p>
          </div>

          <div className="bg-card rounded-lg border p-5">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(rolePermissions)
                            .filter(([, permIds]) => permIds.includes(permission.id))
                            .map(([roleId]) => (
                              <Badge key={roleId} variant="secondary" className="bg-primary/10 text-primary">
                                {roleById[roleId]?.name ?? "Role"}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <UserFormDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        title="Add user"
        roles={roleOptions}
        leaderOptions={leaderOptions}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        showGroups
        showPassword
        onSubmit={handleCreateUser}
      />
      <UserFormDialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => !open && setEditingUserId(null)}
        title="Edit user"
        roles={roleOptions}
        leaderOptions={leaderOptions}
        defaultValues={editingUser ? {
          name: editingUser.name,
          email: editingUser.email,
          phone: editingUser.phone || "",
          role: editingUser.role,
          status: editingUser.status,
          groupIds: userGroups[editingUser.id] ?? [],
        } : undefined}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        showGroups={has("USER_ASSIGN_GROUPS")}
        onSubmit={handleEditUser}
      />

      <Dialog open={Boolean(assignUserGroupsId)} onOpenChange={(open) => !open && setAssignUserGroupsId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign groups</DialogTitle>
            <DialogDescription>Select groups for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {groups.map((group) => {
              const selected = (userGroups[assignUserGroupsId ?? ""] ?? []).includes(group.id);
              return (
                <label key={group.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{group.name}</span>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const userId = assignUserGroupsId;
                      if (!userId) return;
                      const next = toggleSelection(userGroups[userId] ?? [], group.id);
                      setUserGroups((prev) => ({ ...prev, [userId]: next }));
                    }}
                  />
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserGroupsId(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const ok = await confirm({
                  title: "Assign groups",
                  description: "Save group assignments for this user?",
                  confirmText: "Save",
                });
                if (!ok) return;
                if (assignUserGroupsId) {
                  await assignUserGroups(assignUserGroupsId, { groupIds: userGroups[assignUserGroupsId] ?? [] });
                }
                toast.success("Groups updated");
                setAssignUserGroupsId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add group</DialogTitle>
            <DialogDescription>Create a new permission group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={groupForm.description} onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>Cancel</Button>
            <Button onClick={() => handleSaveGroup("add")}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingGroup)} onOpenChange={(open) => !open && setEditingGroupId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
            <DialogDescription>Update group details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={groupForm.description} onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroupId(null)}>Cancel</Button>
            <Button onClick={() => handleSaveGroup("edit")}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignGroupRolesId)} onOpenChange={(open) => !open && setAssignGroupRolesId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign roles</DialogTitle>
            <DialogDescription>Select roles for this group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {roles.map((role) => {
              const selected = (groupRoles[assignGroupRolesId ?? ""] ?? []).includes(role.id);
              return (
                <label key={role.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{role.name}</span>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const groupId = assignGroupRolesId;
                      if (!groupId) return;
                      const next = toggleSelection(groupRoles[groupId] ?? [], role.id);
                      setGroupRoles((prev) => ({ ...prev, [groupId]: next }));
                    }}
                  />
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignGroupRolesId(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const ok = await confirm({
                  title: "Assign roles",
                  description: "Save role assignments for this group?",
                  confirmText: "Save",
                });
                if (!ok) return;
                if (assignGroupRolesId) {
                  await assignGroupRoles(assignGroupRolesId, { roleIds: groupRoles[assignGroupRolesId] ?? [] });
                }
                toast.success("Group roles updated");
                setAssignGroupRolesId(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewUserId)} onOpenChange={(open) => !open && setViewUserId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>Group assignments and audit information.</DialogDescription>
          </DialogHeader>
          {viewingUser ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{viewingUser.name}</span>
                </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{viewingUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{viewingUser.phone ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={viewingUser.status} />
              </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Groups</p>
                <div className="flex flex-wrap gap-2">
                  {(userGroups[viewingUser.id] ?? []).map((groupId) => (
                    <Badge key={groupId} variant="secondary" className="bg-primary/10 text-primary">
                      {groupById[groupId]?.name ?? "Unknown"}
                    </Badge>
                  ))}
                  {(userGroups[viewingUser.id] ?? []).length === 0 && (
                    <span className="text-sm text-muted-foreground">No group assigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Audit</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Created by</span>
                    <span>{viewingUser.audit.createdBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created at</span>
                    <span>{viewingUser.audit.createdAt}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited by</span>
                    <span>{viewingUser.audit.lastEditedBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited at</span>
                    <span>{viewingUser.audit.lastEditedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewUserId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewGroupId)} onOpenChange={(open) => !open && setViewGroupId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Group details</DialogTitle>
            <DialogDescription>Roles, permissions, and audit information.</DialogDescription>
          </DialogHeader>
          {viewingGroup ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Group</span>
                  <span className="text-sm font-medium">{viewingGroup.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Description</span>
                  <span className="text-sm font-medium">{viewingGroup.description}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {getGroupRoleIds(viewingGroup.id).map((roleId) => (
                    <Badge key={roleId} variant="secondary" className="bg-primary/10 text-primary">
                      {roleById[roleId]?.name ?? "Role"}
                    </Badge>
                  ))}
                  {getGroupRoleIds(viewingGroup.id).length === 0 && (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {getGroupPermissions(viewingGroup.id).map((permId) => (
                    <Badge key={permId} variant="secondary" className="bg-muted/70 text-muted-foreground">
                      {permissionById[permId]?.name ?? permId}
                    </Badge>
                  ))}
                  {getGroupPermissions(viewingGroup.id).length === 0 && (
                    <span className="text-sm text-muted-foreground">No permissions assigned</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Audit</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Created by</span>
                    <span>{viewingGroup.audit.createdBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created at</span>
                    <span>{viewingGroup.audit.createdAt}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited by</span>
                    <span>{viewingGroup.audit.lastEditedBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited at</span>
                    <span>{viewingGroup.audit.lastEditedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewGroupId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
