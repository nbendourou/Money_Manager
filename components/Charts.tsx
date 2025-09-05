import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from 'recharts';
import type { MonthlyData, CategoryData } from '../types';

const COLORS = ['#06b6d4', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#84cc16'];
const REVENUE_COLORS = ['#22c55e', '#84cc16', '#a3e635', '#4ade80', '#34d399', '#2dd4bf'];
const SAVINGS_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#0ea5e9', '#38bdf8', '#7dd3fc'];


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-gray-700 border border-gray-600 rounded-md shadow-lg">
        <p className="label font-bold text-cyan-400">{`${label}`}</p>
        {payload.map((pld: any) => (
             <p key={pld.dataKey} style={{ color: pld.color }}>
                {`${pld.name}: ${pld.value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}`}
             </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Monthly Evolution Chart ---
interface MonthlyEvolutionChartProps {
    data: MonthlyData[];
}
export const MonthlyEvolutionChart: React.FC<MonthlyEvolutionChartProps> = ({ data }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', notation: 'compact' }).format(value as number)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenus" fill="#22c55e" name="Revenus" />
                    <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" />
                    <Bar dataKey="epargne" fill="#3b82f6" name="Épargne" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};


// --- Expense Distribution Chart ---
interface DistributionChartProps {
    data: CategoryData[];
    colors: string[];
}
const DistributionPieChart: React.FC<DistributionChartProps> = ({ data, colors }) => {
     return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toLocaleString('fr-FR', {style: 'currency', currency: 'MAD'})}`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export const ExpenseDistributionChart: React.FC<{data: CategoryData[]}> = ({ data }) => {
    return <DistributionPieChart data={data} colors={COLORS} />;
};

export const RevenueDistributionChart: React.FC<{data: CategoryData[]}> = ({ data }) => {
    return <DistributionPieChart data={data} colors={REVENUE_COLORS} />;
};

export const SavingsDistributionChart: React.FC<{data: CategoryData[]}> = ({ data }) => {
    return <DistributionPieChart data={data} colors={SAVINGS_COLORS} />;
};
