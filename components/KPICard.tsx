import React from 'react';

interface KPICardProps {
    title: string;
    value: number;
    format?: 'currency' | 'percent' | 'number';
    color?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, format = 'number', color = 'text-white' }) => {
    
    const formatValue = (val: number): string => {
        switch(format) {
            case 'currency':
                return val.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });
            case 'percent':
                return `${val.toFixed(2)} %`;
            case 'number':
            default:
                return val.toLocaleString('fr-FR');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center transform hover:scale-105 transition-transform duration-300">
            <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
            <p className={`text-2xl font-bold mt-2 ${color}`}>
                {formatValue(value)}
            </p>
        </div>
    );
};

export default KPICard;