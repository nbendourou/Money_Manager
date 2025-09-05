
import React from 'react';
import type { FilterState, DateRange } from '../types';

interface FiltersProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    availableYears: number[];
}

const MONTHS = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
];

const Filters: React.FC<FiltersProps> = ({ filters, setFilters, availableYears }) => {

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
        setFilters(prev => ({ ...prev, year: value, dateRange: { startDate: null, endDate: null } }));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value === 'all' ? 'all' : Number(e.target.value);
        setFilters(prev => ({ ...prev, month: value, dateRange: { startDate: null, endDate: null } }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startDate' | 'endDate') => {
        const value = e.target.value ? new Date(e.target.value) : null;
        setFilters(prev => ({
            ...prev,
            dateRange: { ...prev.dateRange, [field]: value },
            year: 'all',
            month: 'all'
        }));
    };

    return (
        <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-lg font-semibold text-cyan-400">Filtres:</h3>
            
            {/* Year Selector */}
            <div>
                <label htmlFor="year-select" className="sr-only">Année</label>
                <select 
                    id="year-select"
                    value={filters.year} 
                    onChange={handleYearChange}
                    className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    <option value="all">Toutes les années</option>
                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
            </div>

            {/* Month Selector */}
            <div>
                <label htmlFor="month-select" className="sr-only">Mois</label>
                <select 
                    id="month-select"
                    value={filters.month} 
                    onChange={handleMonthChange}
                    className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    <option value="all">Tous les mois</option>
                    {MONTHS.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
            </div>

            {/* Date Range Picker */}
            <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-gray-400">De</label>
                <input 
                    type="date" 
                    id="start-date"
                    onChange={(e) => handleDateChange(e, 'startDate')}
                    className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
             <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-gray-400">à</label>
                <input 
                    type="date" 
                    id="end-date"
                    onChange={(e) => handleDateChange(e, 'endDate')}
                    className="bg-gray-700 border border-gray-600 rounded-md py-1.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
        </div>
    );
};

export default Filters;
