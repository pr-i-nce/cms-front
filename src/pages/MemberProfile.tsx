import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarDays, Mail, MessageSquare, Pencil, Phone, Shield, UserRound, UserRoundMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import MemberFormDialog from "@/components/shared/MemberFormDialog";
import SmsQuickSendDialog from "@/components/shared/SmsQuickSendDialog";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { deleteMember, getMember, updateMember } from "@/api/members";
import { listDepartments, listDepartmentRoles } from "@/api/departments";
import { listCommittees } from "@/api/committees";
import { listSms } from "@/api/sms";
import { usePermissions } from "@/lib/permissions";
import { formatDateValue } from "@/lib/format";
import { ScreenError, ScreenLoading } from "@/components/shared/ScreenStates";

type AuditFields = { createdBy: string; createdAt: string; lastEditedBy: string; lastEditedAt: string };
type Member = {
  id: string; name: string; phone: string; email: string; gender: string;
  department?: string; role?: string; status: "Active" | "Inactive"; dateJoined: string; audit?: AuditFields;
  createdBy?: string; createdAt?: string; lastEditedBy?: string; lastEditedAt?: string;
};
type SmsRecord = { id: string; message: string; date: string; status: "Delivered" | "Pending" | "Failed" | "Sent"; recipients?: string };
type Assignment = { departmentId: string; memberId: string; role: string };
type CommitteeAssignment = { committeeId: string; memberId: string; role: string };

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return digits.length === 9 ? `254${digits}` : digits;
};

const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { has } = usePermissions();
  const canViewSms = has("SMS_VIEW");
  const canSendSms = has("SMS_SEND");
  const canUpdate = has("MEMBER_UPDATE");
  const canDelete = has("MEMBER_DELETE");
  const [member, setMember] = useState<Member | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [committees, setCommittees] = useState<{ id: string; name: string }[]>([]);
  const [departmentAssignments, setDepartmentAssignments] = useState<Assignment[]>([]);
  const [committeeAssignments, setCommitteeAssignments] = useState<CommitteeAssignment[]>([]);
  const [departmentRoles, setDepartmentRoles] = useState<string[]>(["Member"]);
  const [smsRecords, setSmsRecords] = useState<SmsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) {
        setLoadError("The member link is incomplete.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const [memberRes, departmentsRes, committeesRes, rolesRes] = await Promise.all([
          getMember(id),
          listDepartments({ page: 1, pageSize: 200 }),
          listCommittees({ page: 1, pageSize: 200 }),
          listDepartmentRoles(),
        ]);
        const details = memberRes.data;
        const smsRes = canViewSms && details.member.phone
          ? await listSms({ page: 1, pageSize: 50, q: details.member.phone })
          : { data: [] as SmsRecord[] };
        if (!active) return;
        setMember(details.member);
        setDepartmentAssignments(details.departments as Assignment[]);
        setCommitteeAssignments(details.committees as CommitteeAssignment[]);
        setDepartments(departmentsRes.data);
        setCommittees(committeesRes.data);
        setDepartmentRoles(rolesRes.data.length ? rolesRes.data : ["Member"]);
        setSmsRecords(smsRes.data);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load this member.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [id, canViewSms]);

  const departmentNames = useMemo(() => departmentAssignments.flatMap((assignment) => {
    const department = departments.find((item) => item.id === assignment.departmentId);
    return department ? [{ name: department.name, role: assignment.role || "Member" }] : [];
  }), [departmentAssignments, departments]);

  const committeeNames = useMemo(() => committeeAssignments.flatMap((assignment) => {
    const committee = committees.find((item) => item.id === assignment.committeeId);
    return committee ? [{ name: committee.name, role: assignment.role || "Member" }] : [];
  }), [committeeAssignments, committees]);

  const memberSms = useMemo(() => {
    if (!member?.phone) return [];
    const phone = normalizePhone(member.phone);
    return smsRecords.filter((record) => (record.recipients ?? "").split(/[;,\s]+/).some((recipient) => normalizePhone(recipient) === phone)).slice(0, 5);
  }, [member, smsRecords]);

  if (loading) return <ScreenLoading label="Loading member profile" />;
  if (loadError) return <ScreenError title="Member profile unavailable" message={loadError} />;
  if (!member) return <ScreenError title="Member not found" message="This member may have been removed or you may not have access." onRetry={() => navigate("/membership", { replace: true })} />;

  const handleDeactivate = async () => {
    const approved = await confirm({
      title: "Deactivate member",
      description: `Deactivate ${member.name}? They will remain in the records but will no longer be active.`,
      confirmText: "Deactivate member",
      destructive: true,
    });
    if (!approved) return;
    try {
      await deleteMember(member.id);
      toast.success(`${member.name} has been deactivated`);
      navigate("/membership", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not deactivate this member");
    }
  };

  const handleUpdate = async (values: { name: string; email: string; phone: string; gender: string; department: string; role: string; status: "Active" | "Inactive" }) => {
    setSaving(true);
    try {
      const response = await updateMember(member.id, {
        name: values.name, email: values.email.trim() || null, phone: values.phone, gender: values.gender,
        department: values.department, role: values.role, status: values.status,
      });
      const updated = response.data?.member ?? response.data;
      setMember((current) => current ? { ...current, ...values, ...updated } : current);
      toast.success("Member details saved");
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save member details");
    } finally {
      setSaving(false);
    }
  };

  const Detail = ({ icon: Icon, label, children }: { icon: typeof UserRound; label: string; children: React.ReactNode }) => (
    <div className="flex min-w-0 items-start gap-3 border-b border-border/60 py-4 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm font-medium text-foreground">{children}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2 gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to membership
        </Button>
        <span className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:block">Member record</span>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_22px_60px_-44px_hsl(158_32%_14%_/_0.45)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--accent))] to-primary/40" />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex min-w-0 items-center gap-5">
            <div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-2xl bg-primary text-2xl font-semibold text-primary-foreground shadow-lg shadow-primary/15 ring-4 ring-primary/5 sm:h-[88px] sm:w-[88px]">
              {initials(member.name)}
            </div>
            <div className="min-w-0">
              <p className="eyebrow">Church member</p>
              <h1 className="page-title mt-1 truncate text-3xl sm:text-4xl">{member.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{member.role || "Member"}</span>
                {member.department && <><span aria-hidden="true">·</span><span>{member.department}</span></>}
                <span aria-hidden="true">·</span><StatusBadge status={member.status} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {canUpdate && <Button onClick={() => setEditing(true)} className="gap-2"><Pencil className="h-4 w-4" /> Edit record</Button>}
            {canSendSms && <Button variant="outline" onClick={() => setSendingSms(true)} className="gap-2"><MessageSquare className="h-4 w-4" /> Send SMS</Button>}
            {canDelete && <Button variant="outline" aria-label="Deactivate member" title="Deactivate member" onClick={handleDeactivate} className="gap-2 text-destructive hover:text-destructive"><UserRoundMinus className="h-4 w-4" /><span className="hidden sm:inline">Deactivate</span></Button>}
          </div>
        </div>
        <div className="grid grid-cols-1 border-t border-border/60 bg-muted/25 sm:grid-cols-3">
          <div className="px-6 py-4 sm:px-8"><p className="text-xs uppercase tracking-wider text-muted-foreground">Member since</p><p className="mt-1 font-medium">{formatDateValue(member.dateJoined)}</p></div>
          <div className="border-t border-border/60 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8"><p className="text-xs uppercase tracking-wider text-muted-foreground">Departments</p><p className="mt-1 font-medium">{departmentNames.length}</p></div>
          <div className="border-t border-border/60 px-6 py-4 sm:border-l sm:border-t-0 sm:px-8"><p className="text-xs uppercase tracking-wider text-muted-foreground">Committees</p><p className="mt-1 font-medium">{committeeNames.length}</p></div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <section className="surface-panel p-5 sm:p-7">
          <div className="mb-2"><p className="eyebrow">Personal details</p><h2 className="mt-1 text-xl font-semibold">Contact information</h2></div>
          <Detail icon={UserRound} label="Full name">{member.name}</Detail>
          <Detail icon={Phone} label="Phone">{member.phone || "Not provided"}</Detail>
          <Detail icon={Mail} label="Email">{member.email || "Not provided"}</Detail>
          <Detail icon={UserRound} label="Gender">{member.gender || "Not provided"}</Detail>
          <Detail icon={CalendarDays} label="Date joined">{formatDateValue(member.dateJoined)}</Detail>
        </section>

        <div className="space-y-5">
          <section className="surface-panel p-5 sm:p-7">
            <div className="mb-4"><p className="eyebrow">Church life</p><h2 className="mt-1 text-xl font-semibold">Groups & leadership</h2></div>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-primary/70" /> Departments</div>
                {departmentNames.length ? <div className="flex flex-wrap gap-2">{departmentNames.map((item) => <Badge key={`${item.name}-${item.role}`} variant="secondary" className="rounded-full px-3 py-1">{item.name}<span className="ml-1 text-muted-foreground">· {item.role}</span></Badge>)}</div> : <p className="pl-6 text-sm text-muted-foreground">No department assignments</p>}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Shield className="h-4 w-4 text-primary/70" /> Committees</div>
                {committeeNames.length ? <div className="flex flex-wrap gap-2">{committeeNames.map((item) => <Badge key={`${item.name}-${item.role}`} variant="secondary" className="rounded-full px-3 py-1">{item.name}<span className="ml-1 text-muted-foreground">· {item.role}</span></Badge>)}</div> : <p className="pl-6 text-sm text-muted-foreground">No committee assignments</p>}
              </div>
            </div>
          </section>

          {canViewSms && <section className="surface-panel p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow">Communication</p><h2 className="mt-1 text-xl font-semibold">Recent SMS</h2></div><MessageSquare className="h-5 w-5 text-primary/60" /></div>
            {memberSms.length ? <div className="divide-y divide-border/60">{memberSms.map((sms) => <div key={sms.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="line-clamp-2 text-sm leading-6">{sms.message || "Message content unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateValue(sms.date)}</p></div><StatusBadge status={sms.status} /></div>)}</div> : <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">No SMS history found for this phone number.</p>}
          </section>}

          <details className="surface-panel group p-5 sm:p-7">
            <summary className="cursor-pointer list-none"><p className="eyebrow">Record history</p><h2 className="mt-1 text-xl font-semibold">Audit details</h2><p className="mt-1 text-sm text-muted-foreground">View who created or last updated this member record.</p></summary>
            <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border/60 pt-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Created by</dt><dd className="mt-1 font-medium">{member.audit?.createdBy ?? member.createdBy ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Created</dt><dd className="mt-1 font-medium">{formatDateValue(member.audit?.createdAt ?? member.createdAt)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Last edited by</dt><dd className="mt-1 font-medium">{member.audit?.lastEditedBy ?? member.lastEditedBy ?? "—"}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Last edited</dt><dd className="mt-1 font-medium">{formatDateValue(member.audit?.lastEditedAt ?? member.lastEditedAt)}</dd></div>
            </dl>
          </details>
        </div>
      </div>

      <MemberFormDialog open={editing} onOpenChange={setEditing} title="Edit member" departments={departments.map((item) => item.name)} roles={departmentRoles} defaultValues={{ name: member.name, email: member.email, phone: member.phone, gender: member.gender, department: member.department, role: member.role, status: member.status }} onSubmit={handleUpdate} submitting={saving} />
      <SmsQuickSendDialog open={sendingSms} onOpenChange={setSendingSms} recipientType="individual" recipientId={member.id} recipientLabel={`To ${member.name}`} />
    </div>
  );
};

export default MemberProfile;
