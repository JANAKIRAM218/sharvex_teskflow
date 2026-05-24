'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

type ChartType = 'bar' | 'pie' | 'line';

interface ProgressChartProps {
  type: ChartType;
  data: Record<string, unknown>[];
  dataKeys: string[];
  xKey?: string;
  colors?: string[];
  height?: number;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}

const defaultColors = ['#00FFB2', '#00E5FF', '#A78BFA', '#F59E0B', '#EF4444'];

// Custom tooltip with glass effect
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="custom-tooltip">
      {label && <p className="mb-1 text-xs font-medium text-[#94A3B8]">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[#94A3B8]">{entry.name}:</span>
          <span className="text-xs font-semibold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProgressChart({
  type,
  data,
  dataKeys,
  xKey = 'name',
  colors = defaultColors,
  height = 300,
  className,
  showLegend = false,
  showGrid = true,
}: ProgressChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('w-full', className)}
    >
      <ResponsiveContainer width="100%" height={height}>
        {type === 'bar' ? (
          <BarChart data={data} barCategoryGap="20%">
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
              />
            )}
            {dataKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xKey}
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
              />
            )}
            {dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: colors[i % colors.length] }}
                activeDot={{
                  r: 6,
                  fill: colors[i % colors.length],
                  stroke: '#0B0F19',
                  strokeWidth: 2,
                }}
              />
            ))}
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={3}
              dataKey={dataKeys[0]}
              nameKey={xKey}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
              />
            )}
          </PieChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
}
