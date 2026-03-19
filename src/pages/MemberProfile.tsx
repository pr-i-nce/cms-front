import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, MessageSquare, UserMinus, User, Mail, Phone, Calendar, Building2, Shield } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import MemberFormDialog from "@/components/shared/MemberFormDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { deleteMember, getMember, updateMember } from "@/api/members";
import { listDepartments, listDepartmentRoles } from "@/api/departments";
import { listCommittees } from "@/api/committees";
import { listSms } from "@/api/sms";
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

type Department = { id: string; name: string };
type Committee = { id: string; name: string };

type SmsRecord = { id: string; message: string; date: string; status: "Delivered" | "Pending" | "Failed" | "Sent"; recipients: string };

type MemberDetailsResponse = {
  member: Member;
  departments: { departmentId: string; memberId: string; role: string }[];
  committees: { committeeId: string; memberId: string; role: string }[];
};

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [smsRecords, setSmsRecords] = useState<SmsRecord[]>([]);
  const [quickSmsOpen, setQuickSmsOpen] = useState(false);
  const [memberDeptAssignments, setMemberDeptAssignments] = useState<{ departmentId: string; role: string }[]>([]);
  const [memberCommitteeAssignments, setMemberCommitteeAssignments] = useState<{ committeeId: string; role: string }[]>([]);
  const [departmentRoles, setDepartmentRoles] = useState<string[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const confirm = useConfirm();
  const { has } = usePermissions();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const [memberRes, departmentsRes, committeesRes, smsRes, rolesRes] = await Promise.all([
          getMember(id),
          listDepartments({ page: 1, pageSize: 200 }),
          listCommittees({ page: 1, pageSize: 200 }),
          has("SMS_VIEW") ? listSms({ page: 1, pageSize: 50 }) : Promise.resolve({ data: [] as SmsRecord[] }),
          listDepartmentRoles(),
        ]);
        setMember(memberRes.data.member);
        setMemberDeptAssignments(memberRes.data.departments.map((d) => ({ departmentId: d.departmentId, role: d.role })));
        setMemberCommitteeAssignments(memberRes.data.committees.map((c) => ({ committeeId: c.committeeId, role: c.role })));
        setDepartments(departmentsRes.data);
        setCommittees(committeesRes.data);
        setSmsRecords(smsRes.data);
        setDepartmentRoles(rolesRes.data.length ? rolesRes.data : ["Member"]);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load member");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const memberDeptNames = useMemo(() => {
    const entries = memberDeptAssignments
      .map((entry) => {
        const name = departments.find((d) => d.id === entry.departmentId)?.name;
        if (!name) return null;
        return { name, role: entry.role || "Member" };
      })
      .filter(Boolean) as { name: string; role: string }[];
    if (member?.department) {
      const exists = entries.some((item) => item.name === member.department);
      if (!exists) {
        entries.push({ name: member.department, role: member.role || "Member" });
      }
    }
    return entries;
  }, [memberDeptAssignments, departments, member]);

  const memberCommitteeNames = useMemo(() => {
    return memberCommitteeAssignments
      .map((entry) => {
        const name = committees.find((c) => c.id === entry.committeeId)?.name;
        if (!name) return null;
        return { name, role: entry.role || "Member" };
      })
      .filter(Boolean) as { name: string; role: string }[];
  }, [memberCommitteeAssignments, committees]);

  const memberSMS = useMemo(() => {
    if (!member) return [];
    return smsRecords.filter((s) => s.recipients?.includes(member.name.split(" ")[0] || "")).slice(0, 5);
  }, [member, smsRecords]);

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-28">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading member...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  if (!member) return <div className="p-8 text-center text-muted-foreground">Member not found</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-6 lg:col-span-1">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary-foreground">
                {member.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-muted-foreground text-sm">{member.role} · {member.department}</p>
            <div className="mt-2"><StatusBadge status={member.status} /></div>
          </div>
          <div className="flex gap-2 justify-center">
            {has("MEMBER_UPDATE") && (
              <Button size="sm" className="gap-1" onClick={() => setIsEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {has("SMS_SEND") && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setQuickSmsOpen(true)}>
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </Button>
            )}
            {has("MEMBER_DELETE") && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Deactivate member",
                    description: `Deactivate ${member.name}?`,
                    confirmText: "Deactivate",
                    destructive: true,
                  });
                  if (!ok) return;
                  await deleteMember(member.id);
                  toast.info("Member deactivated");
                }}
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <InfoRow icon={User} label="Full Name" value={member.name} />
            <InfoRow icon={Phone} label="Phone" value={member.phone} />
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <InfoRow icon={User} label="Gender" value={member.gender} />
            <InfoRow icon={Calendar} label="Date Joined" value={member.dateJoined} />
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Church Information</h3>
            <div className="space-y-2">
              <InfoRow icon={Building2} label="Departments" value={memberDeptNames.length ? "" : "—"} />
              {memberDeptNames.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-7">
                  {memberDeptNames.map((entry, idx) => (
                    <Badge key={`${entry.name}-${idx}`} variant="secondary">{entry.name} · {entry.role}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <InfoRow icon={Shield} label="Committees" value={memberCommitteeNames.length ? "" : "—"} />
              {memberCommitteeNames.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-7">
                  {memberCommitteeNames.map((entry, idx) => (
                    <Badge key={`${entry.name}-${idx}`} variant="secondary">{entry.name} · {entry.role}</Badge>
                  ))}
                </div>
              )}
            </div>
            <InfoRow icon={Shield} label="Role" value={member.role || "—"} />
          </div>

          {has("SMS_VIEW") && (
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-semibold mb-4">SMS History</h3>
              {memberSMS.length === 0 ? (
                <p className="text-sm text-muted-foreground">No SMS history found</p>
              ) : (
                <div className="space-y-3">
                  {memberSMS.map((sms) => (
                    <div key={sms.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm">{sms.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sms.date}</p>
                      </div>
                      <StatusBadge status={sms.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Audit</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Created by</span>
                <span>{member.audit?.createdBy ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created at</span>
                <span>{member.audit?.createdAt ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last edited by</span>
                <span>{member.audit?.lastEditedBy ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last edited at</span>
                <span>{member.audit?.lastEditedAt ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MemberFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit member"
        departments={departments.map((d) => d.name)}
        roles={departmentRoles}
        defaultValues={{
          name: member.name,
          email: member.email,
          phone: member.phone,
          gender: member.gender,
          department: member.department,
          role: member.role,
          status: member.status,
        }}
        onSubmit={async (values) => {
          const ok = await confirm({
            title: "Save changes",
            description: `Update details for ${values.name}?`,
            confirmText: "Save",
          });
          if (!ok) return;
          await updateMember(member.id, {
            name: values.name,
            email: values.email,
            phone: values.phone,
            gender: values.gender,
            status: values.status,
          });
          setMember({ ...member, ...values });
          toast.success("Member updated successfully");
          setIsEditOpen(false);
        }}
      />
      <SmsQuickSendDialog
        open={quickSmsOpen}
        onOpenChange={setQuickSmsOpen}
        recipientType="individual"
        recipientId={member?.id}
        recipientLabel={member ? `To ${member.name}` : "To member"}
      />
    </div>
  );
};

export default MemberProfile;
