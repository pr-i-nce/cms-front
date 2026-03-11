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

const COLORS = [
  "hsl(173, 58%, 39%)", "hsl(38, 92%, 50%)", "hsl(340, 75%, 55%)",
  "hsl(262, 60%, 55%)", "hsl(200, 80%, 50%)", "hsl(120, 60%, 40%)",
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

const Reports = () => {
  const [summary, setSummary] = useState<any>(null);
  const [backendRequests, setBackendRequests] = useState<any[]>([]);
  const [thresholdMs, setThresholdMs] = useState(150);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backendPage, setBackendPage] = useState(1);
  const [backendMeta, setBackendMeta] = useState<{ page: number; pageSize: number; total: number; totalPages: number } | null>(null);
  const [uiPage, setUiPage] = useState(1);
  const [uiEvents, setUiEvents] = useState<any[]>([]);
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

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading reports...</div>;
  if (loadError) return <div className="p-8 text-center text-destructive">Failed to load data: {loadError}</div>;

  const monthlyMembershipData = summary?.membershipTrend ?? [];
  const departmentDistribution = summary?.departmentDistribution ?? [];
  const smsActivityData = summary?.smsActivity ?? [];
  const backendCount = backendMeta?.total ?? backendRequests.length;
  const backendAvg = backendRequests.length
    ? Math.round(backendRequests.reduce((sum, item) => sum + (item.durationMs || 0), 0) / backendRequests.length)
    : 0;
  const backendMax = backendRequests.length
    ? Math.max(...backendRequests.map((item) => item.durationMs || 0))
    : 0;
  const backendSlowList = backendRequests.filter((item) => (item.durationMs || 0) >= thresholdMs);
  const backendFastList = backendRequests.filter((item) => (item.durationMs || 0) < thresholdMs);

  const uiTotal = uiMeta?.total ?? uiEvents.length;
  const uiTotalPages = uiMeta?.totalPages ?? Math.max(1, Math.ceil(uiTotal / PERF_PAGE_SIZE));
  const uiPageItems = uiEvents;
  const uiAvg = uiPageItems.length
    ? Math.round(uiPageItems.reduce((sum, item) => sum + (item.durationMs || 0), 0) / uiPageItems.length)
    : 0;
  const uiMax = uiPageItems.length
    ? Math.max(...uiPageItems.map((item) => item.durationMs || 0))
    : 0;
  const uiSlowList = uiPageItems.filter((item) => (item.durationMs || 0) >= thresholdMs);
  const uiFastList = uiPageItems.filter((item) => (item.durationMs || 0) < thresholdMs);

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
                {departmentDistribution.map((_: any, i: number) => (
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Backend Total: {backendCount}</Badge>
            <Badge variant="secondary">Backend Avg (page): {backendAvg}ms</Badge>
            <Badge variant="secondary">Backend Max (page): {backendMax}ms</Badge>
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
                <TabsTrigger value="fast">Fast</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                {backendRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests logged yet.</p>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Method</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Duration (ms)</TableHead>
                            <TableHead>Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backendRequests.map((item, idx) => (
                            <TableRow key={`${item.method}-${item.path}-${idx}`}>
                              <TableCell>{item.method}</TableCell>
                              <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                              <TableCell>{item.status}</TableCell>
                              <TableCell>{item.durationMs}</TableCell>
                              <TableCell>{item.timestamp}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead>Path</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration (ms)</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backendSlowList.map((item, idx) => (
                          <TableRow key={`${item.method}-${item.path}-${idx}`}>
                            <TableCell>{item.method}</TableCell>
                            <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>{item.durationMs}</TableCell>
                            <TableCell>{item.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="fast">
                {backendFastList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fast requests logged yet.</p>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead>Path</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Duration (ms)</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backendFastList.map((item, idx) => (
                          <TableRow key={`${item.method}-${item.path}-${idx}`}>
                            <TableCell>{item.method}</TableCell>
                            <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                            <TableCell>{item.status}</TableCell>
                            <TableCell>{item.durationMs}</TableCell>
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
          <TabsContent value="ui">
            <Tabs defaultValue="all">
              <TabsList className="mb-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="slow">Slow</TabsTrigger>
                <TabsTrigger value="fast">Fast</TabsTrigger>
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
                            <TableHead>Duration (ms)</TableHead>
                            <TableHead>Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uiPageItems.map((item, idx) => (
                            <TableRow key={`${item.path}-${idx}`}>
                              <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                              <TableCell>{item.durationMs}</TableCell>
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
                          <TableHead>Duration (ms)</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uiSlowList.map((item, idx) => (
                          <TableRow key={`${item.path}-${idx}`}>
                            <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                            <TableCell>{item.durationMs}</TableCell>
                            <TableCell>{item.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="fast">
                {uiFastList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fast UI events on this page.</p>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead>Duration (ms)</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uiFastList.map((item, idx) => (
                          <TableRow key={`${item.path}-${idx}`}>
                            <TableCell className="max-w-[280px] truncate">{item.path}</TableCell>
                            <TableCell>{item.durationMs}</TableCell>
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
