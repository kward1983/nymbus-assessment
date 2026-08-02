import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { DayProjection } from "../types";

interface ForecastChartProps {
  data: DayProjection[];
}

interface ChartDataPoint {
  date: string;
  runningBalance: number;
}

/**
 * Finds contiguous date ranges where the balance is negative.
 * Returns pairs of [startDate, endDate] strings.
 */
function getNegativeRanges(data: DayProjection[]): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  let rangeStart: string | null = null;

  for (const point of data) {
    if (point.isNegative) {
      if (rangeStart === null) {
        rangeStart = point.date;
      }
    } else {
      if (rangeStart !== null) {
        // End range at previous point
        const prevIndex = data.indexOf(point) - 1;
        ranges.push({ start: rangeStart, end: data[prevIndex].date });
        rangeStart = null;
      }
    }
  }

  // Close any open range at end of data
  if (rangeStart !== null) {
    ranges.push({ start: rangeStart, end: data[data.length - 1].date });
  }

  return ranges;
}

function formatDateTick(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function formatCurrencyAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatCurrencyTooltip(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length || !label) {
    return null;
  }

  const balance = payload[0].value;
  const formattedDate = formatDateTick(label);
  const formattedBalance = formatCurrencyTooltip(balance);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{formattedDate}</p>
      <p
        className={`text-sm font-semibold ${
          balance < 0 ? "text-red-500" : "text-emerald-600"
        }`}
      >
        {formattedBalance}
      </p>
    </div>
  );
}

export default function ForecastChart({ data }: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-500">
          No forecast data available. Import transactions and confirm recurring patterns to generate a forecast.
        </p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.map((d) => ({
    date: d.date,
    runningBalance: d.runningBalance,
  }));

  const negativeRanges = getNegativeRanges(data);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTick}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tickFormatter={formatCurrencyAxis}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={{ stroke: "#e2e8f0" }}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        {negativeRanges.map((range, index) => (
          <ReferenceArea
            key={`neg-${index}`}
            x1={range.start}
            x2={range.end}
            fill="#fee2e2"
            fillOpacity={0.6}
          />
        ))}
        <Line
          type="monotone"
          dataKey="runningBalance"
          stroke="#2569EC"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#2569EC" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
