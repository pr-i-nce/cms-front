import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Eye, RefreshCw, Sparkles, Users, Clock } from "lucide-react";
import SearchBar from "@/components/shared/SearchBar";
import PaginationControls from "@/components/shared/PaginationControls";
import StatusBadge from "@/components/shared/StatusBadge";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/ConfirmProvider";
import { listMembers, listPastors } from "@/api/members";
import { listDepartments, listDepartmentAssignments } from "@/api/departments";
import { listCommittees, listCommitteeMembers } from "@/api/committees";
import { getSmsBalance, listSms, listSmsSegments, listSmsTemplates, sendSms } from "@/api/sms";
import { usePermissions } from "@/lib/permissions";

type AuditFields = {
  createdBy: string;
  createdAt: string;
  lastEditedBy: string;
  lastEditedAt: string;
  sentBy?: string;
};

type SmsRecord = {
  id: string;
  message: string;
  recipients: string;
  recipientCount: number;
  date: string;
  status: "Delivered" | "Pending" | "Failed" | "Sent";
  recipientType: string;
  providerStatus?: string;
  providerCode?: string;
  providerMessage?: string;
  providerResponse?: string;
  audit?: AuditFields;
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
};

type Department = {
  id: string;
  name: string;
  membersCount?: number;
};

type Committee = {
  id: string;
  name: string;
  membersCount?: number;
};

type DepartmentMemberAssignment = {
  departmentId: string;
  departmentName: string;
  role: string;
  member: Member;
};

type CommitteeMemberAssignment = {
  committeeId: string;
  committeeName: string;
  role: string;
  member: Member;
};

type SmsTemplate = {
  label: string;
  body: string;
};

type SmsSegment = {
  key: string;
  label: string;
  count: number;
  memberIds: string[];
};

const PAGE_SIZE = 20;
const ASSIGNMENTS_PAGE_SIZE = 500;

const SMSCenter = () => {
  const [recipientType, setRecipientType] = useState("individual");
  const [recipient, setRecipient] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [greeting, setGreeting] = useState("");
  const [sendMode, setSendMode] = useState("auto");
  const [scheduledAt, setScheduledAt] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const confirm = useConfirm();
  const [personalize, setPersonalize] = useState(true);
  const [viewSmsId, setViewSmsId] = useState<string | null>(null);

  const [smsRecords, setSmsRecords] = useState<SmsRecord[]>([]);
  const [smsTotal, setSmsTotal] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [pastors, setPastors] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [segments, setSegments] = useState<SmsSegment[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [departmentAssignments, setDepartmentAssignments] = useState<DepartmentMemberAssignment[]>([]);
  const [committeeAssignments, setCommitteeAssignments] = useState<CommitteeMemberAssignment[]>([]);
  const { has } = usePermissions();
  const canSeeMembers = has("READ_ALL");
  const canSeePastors = has("READ_ALL");
  const canSeeCommittees = has("READ_ALL") || has("COMMITTEE_UPDATE");
  const canSeeCategories = has("READ_ALL");
  const canSeeDepartments = has("DEPARTMENT_UPDATE") || has("DEPARTMENT_CREATE");
  const canUseCustom = has("READ_ALL");

  const allowedRecipientTypes = useMemo(() => {
    const types: string[] = [];
    if (canSeeMembers) {
      types.push("individual", "selected", "all");
    }
    if (canSeePastors) {
      types.push("pastors");
    }
    if (canSeeDepartments) {
      types.push("department");
    }
    if (canSeeCommittees) {
      types.push("committee");
    }
    if (canSeeCategories) {
      types.push("category");
    }
    if (canUseCustom) {
      types.push("custom");
    }
    return types;
  }, [canSeeMembers, canSeePastors, canSeeDepartments, canSeeCommittees, canSeeCategories, canUseCustom]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const templatesRes = await listSmsTemplates();
        setTemplates(templatesRes.data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!has("SMS_VIEW")) {
      setBalance(null);
      return;
    }
    let active = true;
    const loadBalance = async () => {
      setBalance(null);
      try {
        const balanceRes = await getSmsBalance();
        if (!active) return;
        if (balanceRes?.data?.credit != null) {
          const creditValue = Number(balanceRes.data.credit);
          setBalance(Number.isFinite(creditValue) ? creditValue : null);
        }
      } catch {
        if (!active) return;
        setBalance(null);
      } finally {
        // no-op
      }
    };
    loadBalance();
    return () => {
      active = false;
    };
  }, [has]);

  useEffect(() => {
    if (!has("SMS_VIEW")) return;
    const loadHistory = async () => {
      try {
        const params = {
          page,
          pageSize: PAGE_SIZE,
          q: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        };
        const smsRes = await listSms(params);
        setSmsRecords(smsRes.data);
        setSmsTotal(smsRes.meta?.pagination?.total ?? smsRes.data.length);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load SMS history");
      }
    };
    loadHistory();
  }, [has, page, search, statusFilter]);

  useEffect(() => {
    if (!allowedRecipientTypes.includes(recipientType)) {
      const fallback = allowedRecipientTypes[0] ?? "department";
      setRecipientType(fallback);
    }
  }, [allowedRecipientTypes, recipientType]);

  useEffect(() => {
    const loadRecipients = async () => {
      try {
        if (recipientType === "individual" || recipientType === "selected" || recipientType === "all") {
          if (!canSeeMembers) {
            setMembers([]);
            return;
          }
          const membersRes = await listMembers({ page: 1, pageSize: 300 });
          setMembers(membersRes.data);
          return;
        }
        if (recipientType === "pastors") {
          if (!canSeePastors) {
            setPastors([]);
            return;
          }
          const pastorsRes = await listPastors();
          setPastors(pastorsRes.data);
          return;
        }
        if (recipientType === "department") {
          if (!canSeeDepartments) {
            setDepartments([]);
            setDepartmentAssignments([]);
            return;
          }
          const [departmentsRes, assignmentsRes] = await Promise.all([
            listDepartments({ page: 1, pageSize: 200 }),
            listDepartmentAssignments({ page: 1, pageSize: ASSIGNMENTS_PAGE_SIZE }),
          ]);
          setDepartments(departmentsRes.data);
          setDepartmentAssignments(assignmentsRes.data);
          return;
        }
        if (recipientType === "committee") {
          if (!canSeeCommittees) {
            setCommittees([]);
            setCommitteeAssignments([]);
            return;
          }
          const committeesRes = await listCommittees({ page: 1, pageSize: 200 });
          setCommittees(committeesRes.data);
          const committeeMembersRes = await Promise.all(
            committeesRes.data.map((committee) =>
              listCommitteeMembers(committee.id, { page: 1, pageSize: ASSIGNMENTS_PAGE_SIZE }),
            ),
          );
          setCommitteeAssignments(
            committeeMembersRes.flatMap((res, index) =>
              res.data.map((entry) => ({
                committeeId: committeesRes.data[index].id,
                committeeName: committeesRes.data[index].name,
                role: entry.role,
                member: entry.member,
              })),
            ),
          );
          return;
        }
        if (recipientType === "category") {
          if (!canSeeCategories) {
            setSegments([]);
            return;
          }
          const segmentsRes = await listSmsSegments();
          setSegments(segmentsRes.data);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load recipients");
      }
    };
    loadRecipients();
  }, [recipientType, canSeeMembers, canSeePastors, canSeeDepartments, canSeeCommittees, canSeeCategories]);

  const totalPages = Math.max(1, Math.ceil((smsTotal || smsRecords.length) / PAGE_SIZE));
  const paginated = smsRecords;

  const totalSent = smsRecords.length;
  const totalDelivered = smsRecords.filter((s) => s.status === "Delivered" || s.status === "Sent").length;
  const totalFailed = smsRecords.filter((s) => s.status === "Failed").length;
  const deliveryRate = totalSent ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const avgRecipients = totalSent ? Math.round(smsRecords.reduce((sum, s) => sum + s.recipientCount, 0) / totalSent) : 0;
  const isLowCredit = balance !== null && balance <= 1;

  const departmentsById = useMemo(() => {
    return departments.reduce<Record<string, Department>>((acc, dept) => {
      acc[dept.id] = dept;
      return acc;
    }, {});
  }, [departments]);

  const memberById = useMemo(() => {
    return members.reduce<Record<string, Member>>((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {});
  }, [members]);

  const departmentAssignmentsById = useMemo(() => {
    const map: Record<string, Member[]> = {};
    departmentAssignments.forEach((entry) => {
      const existing = map[entry.departmentId] ?? [];
      if (!existing.some((member) => member.id === entry.member.id)) {
        map[entry.departmentId] = [...existing, entry.member];
      }
    });
    return map;
  }, [departmentAssignments]);

  const committeeAssignmentsById = useMemo(() => {
    const map: Record<string, Member[]> = {};
    committeeAssignments.forEach((entry) => {
      const existing = map[entry.committeeId] ?? [];
      if (!existing.some((member) => member.id === entry.member.id)) {
        map[entry.committeeId] = [...existing, entry.member];
      }
    });
    return map;
  }, [committeeAssignments]);

  const segmentsByKey = useMemo(() => {
    return segments.reduce<Record<string, SmsSegment>>((acc, segment) => {
      acc[segment.key] = segment;
      return acc;
    }, {});
  }, [segments]);

  useEffect(() => {
    setRecipient("");
    setSelectedRecipients([]);
  }, [recipientType]);

  const recipientSummary = () => {
    if (recipientType === "individual") {
      const member = members.find((m) => m.id === recipient);
      return member ? "1 recipient" : "Select a member";
    }
    if (recipientType === "department") {
      const dept = departmentsById[recipient];
      if (!dept) return "Select a department";
      const count = departmentAssignmentsById[recipient]?.length ?? dept.membersCount ?? 0;
      return `${count} recipient${count === 1 ? "" : "s"}`;
    }
    if (recipientType === "committee") {
      const committee = committees.find((c) => c.id === recipient);
      if (!committee) return "Select a committee";
      const count = committeeAssignmentsById[recipient]?.length ?? committee.membersCount ?? 0;
      return `${count} recipient${count === 1 ? "" : "s"}`;
    }
    if (recipientType === "category") {
      const segment = segmentsByKey[recipient];
      if (!segment) return "Select a category";
      return `${segment.count} recipient${segment.count === 1 ? "" : "s"}`;
    }
    if (recipientType === "selected") {
      const count = selectedRecipients.length;
      return count ? `${count} recipient${count === 1 ? "" : "s"}` : "Select members";
    }
    if (recipientType === "pastors") {
      const count = selectedRecipients.length;
      return count ? `${count} recipient${count === 1 ? "" : "s"}` : "Select pastors";
    }
    if (recipientType === "all") {
      const count = members.length;
      return count ? `${count} recipient${count === 1 ? "" : "s"}` : "All members";
    }
    if (recipientType === "custom") {
      return recipient ? "Custom number" : "Enter phone number";
    }
    return "Select recipients";
  };


  const resolvedRecipients = useMemo(() => {
    const dedupe = (items: Member[]) => {
      const seen = new Set<string>();
      return items.filter((member) => {
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      });
    };
    if (recipientType === "individual") {
      const member = members.find((m) => m.id === recipient);
      return member ? [member] : [];
    }
    if (recipientType === "department") {
      return dedupe(departmentAssignmentsById[recipient] ?? []);
    }
    if (recipientType === "committee") {
      return dedupe(committeeAssignmentsById[recipient] ?? []);
    }
    if (recipientType === "category") {
      const segment = segmentsByKey[recipient];
      if (!segment) return [];
      return dedupe(segment.memberIds.map((id) => memberById[id]).filter(Boolean));
    }
    if (recipientType === "selected") {
      return dedupe(selectedRecipients.map((id) => memberById[id]).filter(Boolean));
    }
    if (recipientType === "pastors") {
      const pastorById = pastors.reduce<Record<string, Member>>((acc, member) => {
        acc[member.id] = member;
        return acc;
      }, {});
      return dedupe(selectedRecipients.map((id) => pastorById[id]).filter(Boolean));
    }
    if (recipientType === "all") {
      return dedupe(members);
    }
    return [];
  }, [
    recipientType,
    recipient,
    selectedRecipients,
    departmentAssignmentsById,
    committeeAssignmentsById,
    segmentsByKey,
    memberById,
    pastors,
    members,
  ]);

  const personalizeMessage = (base: string, name?: string) => {
    if (!personalize || !name) return base;
    const firstName = name.split(" ")[0] || name;
    const prefix = greeting.trim();
    if (prefix) {
      if (prefix.includes("{name}")) {
        return `${prefix.replaceAll("{name}", firstName)} ${base}`.trim();
      }
      return `${prefix} ${firstName}, ${base}`.trim();
    }
    if (base.includes("{name}")) {
      return base.replaceAll("{name}", firstName);
    }
    return `Hi ${firstName}, ${base}`;
  };

  const previewMessage = personalizeMessage(message, resolvedRecipients[0]?.name);
  const computedSendMode = useMemo(() => {
    if (sendMode === "single" || sendMode === "bulk" || sendMode === "scheduled") {
      return sendMode;
    }
    if (recipientType === "department" || recipientType === "category") {
      return "bulk";
    }
    return resolvedRecipients.length > 1 ? "bulk" : "single";
  }, [sendMode, recipientType, resolvedRecipients.length]);
  const timeToSend = scheduledAt ? scheduledAt.replace("T", " ") : "";

  const maxChars = 320;
  const charCount = message.length;
  const smsSegments = charCount === 0 ? 0 : Math.ceil(charCount / 160);
  const viewingSms = viewSmsId ? smsRecords.find((s) => s.id === viewSmsId) : null;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (computedSendMode === "scheduled" && !scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }
    const ok = await confirm({
      title: "Send SMS",
      description: "Send this message now?",
      confirmText: "Send",
    });
    if (!ok) return;
    await sendSms({
      recipientType,
      recipientId: recipientType === "individual" || recipientType === "department" || recipientType === "committee" ? recipient : undefined,
      recipientIds: recipientType === "selected" || recipientType === "pastors" ? selectedRecipients : undefined,
      recipientCategory: recipientType === "category" ? recipient : undefined,
      customNumber: recipientType === "custom" ? recipient : undefined,
      greeting: greeting.trim() || undefined,
      message,
      personalize,
      sendMode: computedSendMode,
      timeToSend: computedSendMode === "scheduled" ? timeToSend : undefined,
    });
    const smsRes = await listSms({ page: 1, pageSize: PAGE_SIZE });
    setSmsRecords(smsRes.data);
    setSmsTotal(smsRes.meta?.pagination?.total ?? smsRes.data.length);
    if (personalize && resolvedRecipients.length > 1) {
      toast.success(`SMS queued for ${resolvedRecipients.length} recipients (personalized)`);
    } else {
      toast.success("SMS sent successfully!");
    }
    setMessage("");
    setGreeting("");
    setRecipient("");
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading SMS data...</div>;
  }

  if (loadError) {
    return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS Center</h1>
          <p className="text-muted-foreground">Send, track, and optimize church communications</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">{deliveryRate}% delivery rate</Badge>
          <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">{totalSent} total campaigns</Badge>
          {balance !== null && (
            <Badge variant="secondary" className={isLowCredit ? "bg-destructive/15 text-destructive" : "bg-emerald-100 text-emerald-900"}>
              Balance: {balance.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
      {balance !== null && (
        <div className={isLowCredit ? "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"}>
          {isLowCredit
            ? "Low credit: SMS delivery may fail until you top up your Celcom account."
            : "Credit is sufficient for sending SMS."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Delivered/Sent</p>
          <p className="text-2xl font-semibold">{totalDelivered}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-2xl font-semibold">{totalFailed}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Avg. recipients</p>
          <p className="text-2xl font-semibold">{avgRecipients}</p>
        </div>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          {has("SMS_SEND") && <TabsTrigger value="send">Send SMS</TabsTrigger>}
          {has("SMS_VIEW") && <TabsTrigger value="history">SMS History</TabsTrigger>}
        </TabsList>

        <TabsContent value="send">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Compose Message</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary">{recipientSummary()}</Badge>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipient Type</Label>
                  <Select value={recipientType} onValueChange={setRecipientType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {canSeeMembers && <SelectItem value="individual">Individual Member</SelectItem>}
                      {canSeeMembers && <SelectItem value="selected">Selected Individuals</SelectItem>}
                      {canSeePastors && <SelectItem value="pastors">Pastors</SelectItem>}
                      {canSeeDepartments && <SelectItem value="department">Department</SelectItem>}
                      {canSeeCommittees && <SelectItem value="committee">Committee</SelectItem>}
                      {canSeeCategories && <SelectItem value="category">Category</SelectItem>}
                      {canSeeMembers && <SelectItem value="all">All Members</SelectItem>}
                      {canUseCustom && <SelectItem value="custom">Custom Number</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Send Mode</Label>
                  <Select value={sendMode} onValueChange={setSendMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (based on recipients)</SelectItem>
                      <SelectItem value="single">Single message</SelectItem>
                      <SelectItem value="bulk">Bulk message</SelectItem>
                      <SelectItem value="scheduled">Scheduled message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {computedSendMode === "scheduled" && (
                  <div className="space-y-2">
                    <Label>Schedule Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Recipient</Label>
                  {recipientType === "individual" ? (
                  <SearchableSelect
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="Select member"
                    searchPlaceholder="Search members..."
                    items={members.map((member) => ({
                      value: member.id,
                      label: member.name,
                      keywords: [member.phone, member.email],
                    }))}
                  />
                  ) : recipientType === "selected" ? (
                  <SearchableSelect
                    value={selectedRecipients}
                    onChange={(value) => setSelectedRecipients(Array.isArray(value) ? value : [value])}
                    placeholder="Select members"
                    searchPlaceholder="Search members..."
                    multiple
                    items={members.map((member) => ({
                      value: member.id,
                      label: member.name,
                      keywords: [member.phone, member.email],
                    }))}
                  />
                  ) : recipientType === "pastors" ? (
                  <div className="space-y-2">
                    <SearchableSelect
                      value={selectedRecipients}
                      onChange={(value) => setSelectedRecipients(Array.isArray(value) ? value : [value])}
                      placeholder="Select pastors"
                      searchPlaceholder="Search pastors..."
                      multiple
                      items={pastors.map((pastor) => ({
                        value: pastor.id,
                        label: pastor.name,
                        keywords: [pastor.phone, pastor.email, pastor.role],
                      }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRecipients(pastors.map((p) => p.id))}
                    >
                      Select all pastors
                    </Button>
                  </div>
                  ) : recipientType === "department" ? (
                  <SearchableSelect
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="Select department"
                    searchPlaceholder="Search departments..."
                    items={departments.map((dept) => {
                      const assigned = departmentAssignmentsById[dept.id] ?? [];
                      const count = assigned.length || dept.membersCount || 0;
                      return {
                        value: dept.id,
                        label: `${dept.name} (${count} member${count === 1 ? "" : "s"})`,
                        keywords: [dept.name],
                      };
                    })}
                  />
                  ) : recipientType === "committee" ? (
                  <SearchableSelect
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="Select committee"
                    searchPlaceholder="Search committees..."
                    items={committees.map((committee) => {
                      const assigned = committeeAssignmentsById[committee.id] ?? [];
                      const count = assigned.length || committee.membersCount || 0;
                      return {
                        value: committee.id,
                        label: `${committee.name} (${count} member${count === 1 ? "" : "s"})`,
                        keywords: [committee.name],
                      };
                    })}
                  />
                  ) : recipientType === "category" ? (
                  <SearchableSelect
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    items={segments.map((segment) => ({
                      value: segment.key,
                      label: segment.label,
                      keywords: [segment.label],
                    }))}
                  />
                  ) : recipientType === "all" ? (
                    <Input value="All members" disabled />
                  ) : (
                    <Input placeholder="Enter phone number" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message</Label>
                    <span className="text-xs text-muted-foreground">{charCount}/{maxChars} · {smsSegments} segment{smsSegments === 1 ? "" : "s"}</span>
                  </div>
                  <Textarea
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={maxChars}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <Button key={template.label} size="sm" variant="outline" onClick={() => setMessage(template.body)}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {template.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">Personalize with name</p>
                    <p className="text-xs text-muted-foreground">Use {`{name}`} or auto-prefix greeting.</p>
                  </div>
                  <Switch checked={personalize} onCheckedChange={setPersonalize} />
                </div>

                {personalize && (
                  <div className="space-y-2">
                    <Label>Greeting prefix</Label>
                    <Input
                      placeholder="Hi {name}"
                      value={greeting}
                      onChange={(e) => setGreeting(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {`{name}`} to control placement, or leave blank for default greeting.
                    </p>
                  </div>
                )}

                {has("SMS_SEND") && (
                  <Button onClick={handleSend} className="gap-2">
                    <Send className="h-4 w-4" /> Send SMS
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Audience preview</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Target group</span>
                    <span className="text-foreground">{recipientType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Estimated reach</span>
                    <span className="text-foreground">{recipientSummary()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Schedule</span>
                    <span className="text-foreground">
                      {computedSendMode === "scheduled" && scheduledAt ? scheduledAt.replace("T", " ") : "Immediate"}
                    </span>
                  </div>
                  <div className="space-y-1 pt-2">
                    <p className="text-xs text-muted-foreground">Sample message</p>
                    <p className="text-sm text-foreground bg-muted/40 rounded-md px-3 py-2">
                      {previewMessage || "Type a message to preview personalization."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Delivery checklist</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Confirm recipients are opted in.
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Avoid sending during quiet hours.
                  </div>
                  <div className="flex items-start gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    Keep messages short and action focused.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card rounded-lg border p-5">
            <SearchBar
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder="Search messages..."
              filters={
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {paginated.map((sms) => (
                    <TableRow key={sms.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="max-w-[250px] truncate">{sms.message}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className="text-sm truncate block" title={sms.recipients}>
                          {sms.recipients}
                        </span>
                        {sms.recipientCount > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">({sms.recipientCount})</span>
                        )}
                      </TableCell>
                      <TableCell>{sms.date}</TableCell>
                      <TableCell><StatusBadge status={sms.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewSmsId(sms.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              confirm({
                                title: "Resend message",
                                description: "Resend this SMS?",
                                confirmText: "Resend",
                              }).then((ok) => {
                                if (!ok) return;
                                toast.info("Message resent");
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
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
              totalItems={smsTotal || paginated.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(viewSmsId)} onOpenChange={(open) => !open && setViewSmsId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>SMS details</DialogTitle>
            <DialogDescription>Message content and audit information.</DialogDescription>
          </DialogHeader>
          {viewingSms ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recipients</span>
                  <span className="text-sm font-medium">{viewingSms.recipients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Count</span>
                  <span className="text-sm font-medium">{viewingSms.recipientCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={viewingSms.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm font-medium">{viewingSms.date}</span>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                {viewingSms.message}
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Audit</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Created by</span>
                    <span>{viewingSms.audit.createdBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created at</span>
                    <span>{viewingSms.audit.createdAt}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited by</span>
                    <span>{viewingSms.audit.lastEditedBy}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last edited at</span>
                    <span>{viewingSms.audit.lastEditedAt}</span>
                  </div>
                  {viewingSms.audit.sentBy ? (
                    <div className="flex items-center justify-between">
                      <span>Sent by</span>
                      <span>{viewingSms.audit.sentBy}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium">Provider response</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span>{viewingSms.providerStatus ?? "Unknown"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Code</span>
                    <span>{viewingSms.providerCode ?? "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Message</span>
                    <span className="text-right">{viewingSms.providerMessage ?? "N/A"}</span>
                  </div>
                  {viewingSms.providerResponse ? (
                    <div className="rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
                      {viewingSms.providerResponse}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSmsId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SMSCenter;
