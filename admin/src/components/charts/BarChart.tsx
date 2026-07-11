import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VoxBarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#4f46e5', '#7c3aed'];

export function VoxBarChart({ data, xKey, yKey, color = '#6366f1', height = 250 }: VoxBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.06)" />
        <XAxis
          dataKey={xKey}
          stroke="#4b5563"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#4b5563"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#141422',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '12px',
          }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
