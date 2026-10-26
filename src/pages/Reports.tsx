import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useEffect, useState } from "react";
import { getReportSummary, getRequestMetrics, getUiLatency } from "@/api/reports";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaginationControls from "@/components/shared/PaginationControls";
import { ScreenError, ScreenLoading } from "@/components/shared/ScreenStates";

const COLORS = [
  "hsl(158, 42%, 30%)", "hsl(40, 58%, 52%)", "hsl(13, 56%, 56%)",
  "hsl(205, 28%, 48%)", "hsl(102, 22%, 47%)", "hsl(340, 35%, 58%)",
  "hsl(20, 80%, 55%)", "hsl(280, 65%, 50%)",
];

const ChartCard = ({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) => (
  <div
    className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0"
    style={{ animationDelay: `${delay}ms` }}
  >
    <h3 className="font-semibold mb-4">{title}</h3>
    {children}
  </div>
);

type BackendLatencyRow = {
  environment?: string | null;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  databaseDurationMs?: number | null;
  databaseQueryCount?: number | null;
  appDurationMs?: number | null;
  sampleCount?: number | null;
  maxDurationMs?: number | null;
  timestamp: string;
};
type ReportPoint = { month?: string; members?: number; newMembers?: number; department?: string; count?: number };
type ReportSummary = { membershipTrend?: ReportPoint[]; departmentDistribution?: ReportPoint[]; smsActivity?: ReportPoint[] };
type UiLatencyRow = { path: string; durationMs: number; sampleCount?: number | null; maxDurationMs?: number | null; timestamp: string };

const BackendLatencyTable = ({ rows }: { rows: BackendLatencyRow[] }) => (
  <div className="rounded-lg border overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Environment</TableHead><TableHead>Method</TableHead><TableHead>Path</TableHead>
          <TableHead>Status</TableHead><TableHead>Avg total ms</TableHead><TableHead>Peak ms</TableHead><TableHead>Samples</TableHead><TableHead>DB ms*</TableHead>
          <TableHead>DB queries</TableHead><TableHead>App ms*</TableHead><TableHead>Likely bottleneck</TableHead><TableHead>Timestamp</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item, idx) => {
          const databaseMeasured = item.databaseDurationMs != null;
          const bottleneck = !databaseMeasured
            ? "Legacy"
            : item.databaseDurationMs! >= item.durationMs / 2 ? "Database" : "Backend / other";
          return (
            <TableRow key={`${item.method}-${item.path}-${item.timestamp}-${idx}`}>
              <TableCell>{item.environment || "Legacy"}</TableCell>
              <TableCell>{item.method}</TableCell>
              <TableCell className="max-w-[240px] truncate" title={item.path}>{item.path}</TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell className="font-medium">{item.durationMs}</TableCell>
              <TableCell>{item.maxDurationMs ?? item.durationMs}</TableCell>
              <TableCell>{item.sampleCount ?? 1}</TableCell>
              <TableCell>{databaseMeasured ? item.databaseDurationMs : "—"}</TableCell>
              <TableCell>{item.databaseQueryCount ?? "—"}</TableCell>
              <TableCell>{item.appDurationMs ?? "—"}</TableCell>
              <TableCell><Badge variant={bottleneck === "Database" ? "destructive" : "secondary"}>{bottleneck}</Badge></TableCell>
              <TableCell className="whitespace-nowrap">{item.timestamp}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

const Reports = () => {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [backendRequests, setBackendRequests] = useState<BackendLatencyRow[]>([]);
  const [thresholdMs, setThresholdMs] = useState(150);
  const [persistenceThresholdMs, setPersistenceThresholdMs] = useState(500);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backendPage, setBackendPage] = useState(1);
  const [backendMeta, setBackendMeta] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  const [uiPage, setUiPage] = useState(1);
  const [uiEvents, setUiEvents] = useState<UiLatencyRow[]>([]);
  const [uiMeta, setUiMeta] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  const [performanceTab, setPerformanceTab] = useState("backend");

  const PERF_PAGE_SIZE = 25;

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const summaryRes = await getReportSummary();
        setSummary(summaryRes.data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const allRes = await getRequestMetrics({ page: backendPage, pageSize: PERF_PAGE_SIZE });
        setBackendRequests(allRes.data?.items ?? []);
        setThresholdMs(allRes.data?.thresholdMs ?? 150);
        setPersistenceThresholdMs(allRes.data?.persistenceThresholdMs ?? 500);
        setBackendMeta(allRes.data?.pagination ?? null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      }
    };
    loadMetrics();
  }, [backendPage]);

  useEffect(() => {
    if (performanceTab === "ui") {
      setUiPage(1);
    }
  }, [performanceTab]);

  useEffect(() => {
    if (performanceTab !== "ui") return;
    const loadUiMetrics = async () => {
      try {
        const uiRes = await getUiLatency({ page: uiPage, pageSize: PERF_PAGE_SIZE });
        setUiEvents(uiRes.data?.items ?? []);
        setUiMeta(uiRes.data?.pagination ?? null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load data");
      }
    };
    loadUiMetrics();
  }, [performanceTab, uiPage]);

  if (loading) return <ScreenLoading label="Loading reports" />;
  if (loadError) return <ScreenError message={`Reports could not be loaded: ${loadError}`} />;

  const monthlyMembershipData = summary?.membershipTrend ?? [];
  const departmentDistribution = summary?.departmentDistribution ?? [];
  const smsActivityData = summary?.smsActivity ?? [];
  const backendCount = backendMeta?.total ?? backendRequests.length;
  const backendSampleCount = backendRequests.reduce((sum, item) => sum + (item.sampleCount ?? 1), 0);
  const backendAvg = backendRequests.length
    ? Math.round(backendRequests.reduce((sum, item) => sum + (item.durationMs || 0) * (item.sampleCount ?? 1), 0) / backendSampleCount)
    : 0;
  const backendMax = backendRequests.length
    ? Math.max(...backendRequests.map((item) => item.maxDurationMs ?? item.durationMs ?? 0))
    : 0;
  const backendSlowList = backendRequests.filter((item) => (item.durationMs || 0) >= thresholdMs);
  const backendErrorList = backendRequests.filter((item) => item.status >= 500);
  const databaseSlowList = backendRequests.filter((item) => item.databaseDurationMs != null && item.databaseDurationMs >= thresholdMs);
  const appSlowList = backendRequests.filter((item) => item.appDurationMs != null && item.appDurationMs >= thresholdMs);
  const measuredRequests = backendRequests.filter((item) => item.databaseDurationMs != null);
  const measuredSampleCount = measuredRequests.reduce((sum, item) => sum + (item.sampleCount ?? 1), 0);
  const databaseAvg = measuredRequests.length
    ? Math.round(measuredRequests.reduce((sum, item) => sum + Number(item.databaseDurationMs || 0) * (item.sampleCount ?? 1), 0) / measuredSampleCount)
    : null;
  const appAvg = measuredRequests.length
    ? Math.round(measuredRequests.reduce((sum, item) => sum + Number(item.appDurationMs || 0) * (item.sampleCount ?? 1), 0) / measuredSampleCount)
    : null;

  const uiTotal = uiMeta?.total ?? uiEvents.length;
  const uiTotalPages = uiMeta?.totalPages ?? Math.max(1, Math.ceil(uiTotal / PERF_PAGE_SIZE));
  const uiPageItems = uiEvents;
  const uiSampleCount = uiPageItems.reduce((sum, item) => sum + (item.sampleCount ?? 1), 0);
  const uiAvg = uiPageItems.length
    ? Math.round(uiPageItems.reduce((sum, item) => sum + (item.durationMs || 0) * (item.sampleCount ?? 1), 0) / uiSampleCount)
    : 0;
  const uiMax = uiPageItems.length
    ? Math.max(...uiPageItems.map((item) => item.maxDurationMs ?? item.durationMs ?? 0))
    : 0;
  const uiSlowList = uiPageItems.filter((item) => (item.durationMs || 0) >= thresholdMs);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Comprehensive analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Membership Growth Trend" delay={0}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyMembershipData}>
              <defs>
                <linearGradient id="rptMembers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="members" stroke={COLORS[0]} fill="url(#rptMembers)" strokeWidth={2} name="Total Members" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="SMS Activity" delay={100}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={smsActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill={COLORS[4]} radius={[4, 4, 0, 0]} name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Department Distribution" delay={200}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentDistribution}
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                dataKey="count"
                paddingAngle={3}
              >
                {departmentDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-card rounded-lg border p-5 animate-fade-in-up opacity-0" style={{ animationDelay: "300ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold">System Performance</h3>
            <p className="text-xs text-muted-foreground">Backend and UI latency (threshold {thresholdMs}ms)</p>
            <p className="mt-1 text-xs text-muted-foreground">DB ms is cumulative Prisma query time; App ms is the remaining request time estimate. Parallel DB queries can make cumulative DB time exceed total request time.</p>
            <p className="mt-1 text-xs text-muted-foreground">Only server errors and requests at or above {persistenceThresholdMs}ms are grouped in memory and written to the database once per minute. Faster requests stay in a bounded in-memory window; UI samples below the threshold are discarded in the browser.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Issue buckets: {backendCount}</Badge>
            <Badge variant="secondary">Issue samples (page): {backendSampleCount}</Badge>
            <Badge variant="secondary">Backend Avg (page): {backendAvg}ms</Badge>
            <Badge variant="secondary">Backend Max (page): {backendMax}ms</Badge>
            <Badge variant="secondary">DB Avg (page): {databaseAvg == null ? "—" : `${databaseAvg}ms`}</Badge>
            <Badge variant="secondary">App Avg (page): {appAvg == null ? "—" : `${appAvg}ms`}</Badge>
            <Badge variant="secondary">DB slow: {databaseSlowList.length}</Badge>
            <Badge variant="secondary">App slow: {appSlowList.length}</Badge>
            <Badge variant="secondary">UI Total: {uiTotal}</Badge>
          </div>
        </div>
        <Tabs value={performanceTab} onValueChange={setPerformanceTab} className="space-y-3">
          <TabsList className="mb-3">
            <TabsTrigger value="backend">Backend Latency</TabsTrigger>
            <TabsTrigger value="ui">UI Latency</TabsTrigger>
          </TabsList>
          <TabsContent value="backend">
            <Tabs defaultValue="all">
              <TabsList className="mb-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="slow">Slow</TabsTrigger>
                <TabsTrigger value="database">Slow database</TabsTrigger>
                <TabsTrigger value="application">Slow backend</TabsTrigger>
                <TabsTrigger value="errors">Server errors</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {backendRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests logged yet.</p>
                ) : (
                  <>
                    <BackendLatencyTable rows={backendRequests} />
                    {backendMeta && (
                      <PaginationControls
                        currentPage={backendMeta.page}
                        totalPages={backendMeta.totalPages}
                        totalItems={backendMeta.total}
                        pageSize={backendMeta.pageSize}
                        onPageChange={setBackendPage}
                      />
                    )}
                  </>
                )}
              </TabsContent>
              <TabsContent value="slow">
                {backendSlowList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slow requests logged yet.</p>
                ) : (
                  <BackendLatencyTable rows={backendSlowList} />
                )}
              </TabsContent>
              <TabsContent value="database">
                {databaseSlowList.length ? <BackendLatencyTable rows={databaseSlowList} /> : <p className="text-sm text-muted-foreground">No measured slow database requests on this page.</p>}
              </TabsContent>
              <TabsContent value="application">
                {appSlowList.length ? <BackendLatencyTable rows={appSlowList} /> : <p className="text-sm text-muted-foreground">No measured slow backend overhead on this page.</p>}
              </TabsContent>
              <TabsContent value="errors">
                {backendErrorList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No server errors logged on this page.</p>
                ) : (
                  <BackendLatencyTable rows={backendErrorList} />
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="ui">
            <Tabs defaultValue="all">
              <TabsList className="mb-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="slow">Slow</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {uiPageItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No UI latency events yet.</p>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Path</TableHead>
                            <TableHead>Avg ms</TableHead>
                            <TableHead>Peak ms</TableHead>
                            <TableHead>Samples</TableHead>
                            <TableHead>Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uiPageItems.map((item, idx) => (
                            <TableRow key={`${item.path}-${idx}`}>
                              <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                              <TableCell>{item.durationMs}</TableCell>
                              <TableCell>{item.maxDurationMs ?? item.durationMs}</TableCell>
                              <TableCell>{item.sampleCount ?? 1}</TableCell>
                              <TableCell>{item.timestamp}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <PaginationControls
                      currentPage={uiPage}
                      totalPages={uiTotalPages}
                      totalItems={uiTotal}
                      pageSize={PERF_PAGE_SIZE}
                      onPageChange={setUiPage}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">UI Samples (page): {uiSampleCount}</Badge>
                      <Badge variant="secondary">UI Avg (page): {uiAvg}ms</Badge>
                      <Badge variant="secondary">UI Max (page): {uiMax}ms</Badge>
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="slow">
                {uiSlowList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slow UI events on this page.</p>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead>Avg ms</TableHead>
                          <TableHead>Peak ms</TableHead>
                          <TableHead>Samples</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uiSlowList.map((item, idx) => (
                          <TableRow key={`${item.path}-${idx}`}>
                            <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                            <TableCell>{item.durationMs}</TableCell>
                            <TableCell>{item.maxDurationMs ?? item.durationMs}</TableCell>
                            <TableCell>{item.sampleCount ?? 1}</TableCell>
                            <TableCell>{item.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
