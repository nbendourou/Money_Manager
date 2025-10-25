import React from 'react';
import type { LucideProps } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: number;
    format?: 'currency' | 'percent' | 'number';
    color?: string;
    Icon: React.ComponentType<LucideProps>;
    previousValue?: number;
    higherIsBetter?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, format = 'number', color = 'text-white', Icon, previousValue, higherIsBetter = true }) => {
    
    const formatValue = (val: number): string => {
        switch(format) {
            case 'currency':
                return val.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
            case 'percent':
                return `${val.toFixed(2)} %`;
            case 'number':
            default:
                return val.toLocaleString('fr-FR');
        }
    };

    const renderComparison = () => {
        if (previousValue === undefined || previousValue === null || value === previousValue) {
            return null;
        }
        
        if (previousValue === 0) {
            return value > 0 ? <span className="text-xs font-semibold text-green-400">(Nouveau)</span> : null;
        }

        const percentChange = ((value - previousValue) / Math.abs(previousValue)) * 100;
        
        if (Math.abs(percentChange) < 0.1) return null;

        const isGood = higherIsBetter ? percentChange >= 0 : percentChange < 0;
        const trendColor = isGood ? 'text-green-400' : 'text-red-400';
        const TrendIcon = percentChange >= 0 ? ArrowUp : ArrowDown;

        return (
            <span className={`ml-2 text-xs font-semibold flex items-center ${trendColor}`}>
                <TrendIcon size={12} className="mr-0.5" />
                {`${Math.abs(percentChange).toFixed(1)}%`}
            </span>
        );
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center transform hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${color || 'text-gray-400'} opacity-75`} />
                <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
            </div>
            <div className="flex items-baseline justify-center mt-2">
                <p className={`text-2xl font-bold ${color}`}>
                    {formatValue(value)}
                </p>
                {renderComparison()}
            </div>
        </div>
    );
};

export default KPICard;
