import {
  Users,
  Building2,
  MessageSquare,
  UserPlus,
  Plus,
  Send,
  TrendingUp,
  CalendarRange,
  Activity,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/shared/StatCard";
import { useEffect, useMemo, useState } from "react";
import { getDashboardFull } from "@/api/reports";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(173, 58%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(340, 75%, 55%)",
  "hsl(262, 60%, 55%)",
  "hsl(200, 80%, 50%)",
  "hsl(120, 60%, 40%)",
  "hsl(20, 80%, 55%)",
  "hsl(280, 65%, 50%)",
];

type Activity = { id: string; action: string; details: string; time: string; type: string };
type SmsRecord = { id: string; date: string; status: string; message?: string; recipients?: string };
type DashboardSummary = {
  totalMembers: number;
  activeMembers: number;
  newMembers: number;
  newMembersMonth?: string;
  totalDepartments: number;
  topDepartments: { id: string; name: string; count: number }[];
  smsTotal: number;
  smsDelivered: number;
  smsFailed: number;
  smsDeliveryRate: number;
  latestSms?: SmsRecord | null;
  recentActivities: Activity[];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<(DashboardSummary & { membershipTrend?: any[]; departmentDistribution?: any[]; smsActivity?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const dashboardRes = await getDashboardFull();
        setDashboard(dashboardRes.data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const monthLabel = dashboard?.newMembersMonth
    ? new Date(`${dashboard.newMembersMonth}-01`).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "This month";
  const newMembersThisMonth = dashboard?.newMembers ?? 0;
  const activeMembers = dashboard?.activeMembers ?? 0;
  const totalSmsSent = dashboard?.smsTotal ?? 0;
  const totalSmsDelivered = dashboard?.smsDelivered ?? 0;
  const deliveryRate = dashboard?.smsDeliveryRate ?? (totalSmsSent ? Math.round((totalSmsDelivered / totalSmsSent) * 100) : 0);
  const membershipTrend = dashboard?.membershipTrend ?? [];
  const departmentDistributionData = dashboard?.departmentDistribution ?? [];
  const smsActivityData = dashboard?.smsActivity ?? [];
  const membershipNetGrowth = membershipTrend.length > 1 ? membershipTrend[membershipTrend.length - 1].members - membershipTrend[0].members : 0;
  const membershipGrowthPct = membershipTrend.length > 1 && membershipTrend[0].members
    ? Math.round((membershipNetGrowth / membershipTrend[0].members) * 100)
    : 0;
  const topDepartments = dashboard?.topDepartments ?? [];
  const latestSms = dashboard?.latestSms ?? null;
  const activityItems = useMemo(() => dashboard?.recentActivities ?? [], [dashboard]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;

  return (
    <div className="space-y-6"> 

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Members" value={dashboard?.totalMembers ?? 0} icon={Users} gradient="primary" delay={0} subtitle={`${newMembersThisMonth} joined ${monthLabel}`} sparkData={membershipTrend.map((row: any) => row.members)} />
        <StatCard title="Departments" value={dashboard?.totalDepartments ?? 0} icon={Building2} gradient="accent" delay={100} sparkData={departmentDistributionData.map((row: any) => row.count)} />
        <StatCard title="SMS Sent" value={totalSmsSent} icon={MessageSquare} gradient="rose" delay={200} subtitle="This month" sparkData={smsActivityData.map((row: any) => row.count)} />
        <StatCard title={`New Members (${monthLabel})`} value={newMembersThisMonth} icon={UserPlus} gradient="violet" delay={300} subtitle="This month" sparkData={membershipTrend.map((row: any) => row.newMembers)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "500ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Membership Growth</h3>
              <Badge variant="secondary" className="bg-primary/10 text-primary">Year view</Badge>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={membershipTrend}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="members" stroke="hsl(173, 58%, 39%)" fill="url(#colorMembers)" strokeWidth={2} />
                <Area type="monotone" dataKey="newMembers" stroke="hsl(38, 92%, 50%)" fill="hsl(38, 92%, 50%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "600ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Attendance</h3>
              <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">Not available</Badge>
            </div>
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Attendance data is not available yet.
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "650ms" }}>
            <h3 className="font-semibold mb-4">Department Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={departmentDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  dataKey="count"
                  labelLine={false}
                >
                  {departmentDistributionData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "700ms" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Top Departments</h3>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/membership")}>View all</Button>
            </div>
            <div className="mt-4 space-y-3">
              {topDepartments.map((dept, index) => (
                <div key={dept.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div>
                    <p className="text-sm font-medium">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">Leader: {dept.leader}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{dept.count}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Most active</span>
                <span>#{topDepartments[0]?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0 lg:col-span-2" style={{ animationDelay: "750ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">SMS Activity</h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary">Outreach</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={smsActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="delivered" fill="hsl(173, 58%, 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" fill="hsl(340, 75%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "800ms" }}>
          <h3 className="font-semibold mb-4">Latest Broadcast</h3>
          {latestSms ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">{latestSms.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestSms.recipientType} • {latestSms.recipientCount} recipients
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sent {latestSms.date}</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  View campaign <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No SMS campaigns yet.</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "850ms" }}>
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {activityItems.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div
                className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                  activity.type === "member"
                    ? "bg-primary"
                    : activity.type === "sms"
                    ? "bg-accent"
                    : "bg-chart-4"
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.details}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-auto">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
