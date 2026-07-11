import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface VoxDonutChartProps {
  data: { name: string; value: number }[];
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280', '#6366f1', '#8b5cf6'];

export function VoxDonutChart({ data, colors = DEFAULT_COLORS, height = 250 }: VoxDonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#141422',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '12px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
