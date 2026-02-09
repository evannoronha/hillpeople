import { useMemo } from 'react';
import { GRADE_ORDER, parseGrade, extractGrade } from '../../lib/grades';
import type { TicksByDate, TicklistFilters, StyleFilter } from './types';
import { DEFAULT_FILTERS } from './types';
import { isDefaultFilters } from './filterTicks';

interface TicklistFilterBarProps {
    filters: TicklistFilters;
    onChange: (filters: TicklistFilters) => void;
    ticks: TicksByDate[];
}

const selectClass =
    'px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-header)]';

const inputClass =
    'px-3 py-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-header)] min-w-[180px]';

export default function TicklistFilterBar({ filters, onChange, ticks }: TicklistFilterBarProps) {
    // Collect unique route types from current data
    const routeTypes = useMemo(() => {
        const types = new Set<string>();
        for (const day of ticks) {
            for (const route of day.routes) {
                if (route.route?.routeType) {
                    types.add(route.route.routeType);
                }
            }
        }
        return Array.from(types).sort();
    }, [ticks]);

    // Collect grades present in current data for the dropdowns
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        for (const day of ticks) {
            for (const route of day.routes) {
                if (route.route?.rating) {
                    const grade = extractGrade(route.route.rating);
                    if (grade !== 'Unknown' && parseGrade(grade) !== -1) {
                        grades.add(grade);
                    }
                }
            }
        }
        return GRADE_ORDER.filter(g => grades.has(g));
    }, [ticks]);

    const update = (partial: Partial<TicklistFilters>) => {
        onChange({ ...filters, ...partial });
    };

    const hasFilters = !isDefaultFilters(filters);

    return (
        <div className="flex flex-wrap gap-3 items-center mb-6">
            {/* Route Type */}
            <select
                className={selectClass}
                value={filters.routeType || ''}
                onChange={(e) => update({ routeType: e.target.value || null })}
            >
                <option value="">All types</option>
                {routeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>

            {/* Grade Range */}
            <div className="flex items-center gap-1">
                <select
                    className={selectClass}
                    value={filters.gradeMin || ''}
                    onChange={(e) => update({ gradeMin: e.target.value || null })}
                >
                    <option value="">Min grade</option>
                    {availableGrades.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
                <span className="text-sm opacity-50">to</span>
                <select
                    className={selectClass}
                    value={filters.gradeMax || ''}
                    onChange={(e) => update({ gradeMax: e.target.value || null })}
                >
                    <option value="">Max grade</option>
                    {availableGrades.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            </div>

            {/* Stars */}
            <select
                className={selectClass}
                value={filters.minStars}
                onChange={(e) => update({ minStars: parseInt(e.target.value) })}
            >
                <option value={0}>Any stars</option>
                <option value={1}>{'\u2605'}+</option>
                <option value={2}>{'\u2605\u2605'}+</option>
                <option value={3}>{'\u2605\u2605\u2605'}+</option>
                <option value={4}>{'\u2605\u2605\u2605\u2605'}</option>
            </select>

            {/* Style */}
            <select
                className={selectClass}
                value={filters.styleFilter}
                onChange={(e) => update({ styleFilter: e.target.value as StyleFilter })}
            >
                <option value="all">All styles</option>
                <option value="lead">Leads only</option>
                <option value="lead_sends">Lead sends</option>
            </select>

            {/* Search */}
            <input
                type="text"
                className={inputClass}
                placeholder="Search routes..."
                value={filters.search}
                onChange={(e) => update({ search: e.target.value })}
            />

            {/* Clear filters */}
            {hasFilters && (
                <button
                    type="button"
                    className="text-sm text-[var(--color-header)] hover:underline"
                    onClick={() => onChange(DEFAULT_FILTERS)}
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
