import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface StatCardProps {
  label: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  color?: string;
  delay?: number;
}

export function StatCard({ label, value, previousValue, icon: Icon, color = 'accent', delay = 0 }: StatCardProps) {
  const change = previousValue !== undefined && previousValue > 0
    ? ((value - previousValue) / previousValue * 100).toFixed(1)
    : null;
  const isPositive = change !== null && parseFloat(change) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-panel p-5 relative overflow-hidden group hover:border-accent/30 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">{formatNumber(value)}</p>
          {change !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? 'text-success' : 'text-danger'}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPositive ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}/10 border border-${color}/20`}>
          <Icon size={22} className={`text-${color}`} />
        </div>
      </div>
    </motion.div>
  );
}
