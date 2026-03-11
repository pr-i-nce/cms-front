import { LucideIcon } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: "primary" | "accent" | "rose" | "violet";
  delay?: number;
  subtitle?: string;
  sparkData?: number[];
}

const colorMap = {
  primary: { bg: "bg-primary/5", border: "border-primary/15", text: "text-primary", icon: "bg-primary/10", spark: "hsl(173, 58%, 39%)" },
  accent: { bg: "bg-accent/5", border: "border-accent/15", text: "text-accent", icon: "bg-accent/10", spark: "hsl(38, 92%, 50%)" },
  rose: { bg: "bg-chart-3/5", border: "border-chart-3/15", text: "text-chart-3", icon: "bg-chart-3/10", spark: "hsl(340, 75%, 55%)" },
  violet: { bg: "bg-chart-4/5", border: "border-chart-4/15", text: "text-chart-4", icon: "bg-chart-4/10", spark: "hsl(262, 60%, 55%)" },
};

const StatCard = ({ title, value, icon: Icon, gradient, delay = 0, subtitle, sparkData = [3, 5, 4, 7, 5, 8, 6, 9, 7, 10] }: StatCardProps) => {
  const c = colorMap[gradient];
  const chartData = sparkData.map((v) => ({ v }));

  return (
    <div
      className={`animate-fade-in-up opacity-0 rounded-xl border ${c.border} ${c.bg} p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Sparkline in background */}
      <div className="absolute bottom-0 right-0 w-[55%] h-[60%] opacity-20 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`spark-${gradient}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.spark} stopOpacity={0.6} />
                <stop offset="100%" stopColor={c.spark} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={c.spark} fill={`url(#spark-${gradient})`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`${c.icon} rounded-xl p-2.5`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
