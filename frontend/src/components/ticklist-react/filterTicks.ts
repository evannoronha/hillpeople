import { parseGrade, gradeFloor, gradeCeil } from '../../lib/grades';
import type { TicksByDate, GroupedRoute, TicklistFilters } from './types';

export function isDefaultFilters(filters: TicklistFilters): boolean {
    return (
        !filters.routeType &&
        !filters.gradeMin &&
        !filters.gradeMax &&
        filters.minStars === 0 &&
        !filters.search &&
        filters.styleFilter === 'all'
    );
}

export function applyFilters(ticks: TicksByDate[], filters: TicklistFilters): TicksByDate[] {
    if (isDefaultFilters(filters)) return ticks;

    return ticks
        .map(day => ({
            ...day,
            routes: day.routes.filter(route => matchesFilters(route, filters)),
        }))
        .filter(day => day.routes.length > 0);
}

function matchesFilters(route: GroupedRoute, filters: TicklistFilters): boolean {
    // Route type filter
    if (filters.routeType && route.route?.routeType?.toLowerCase() !== filters.routeType.toLowerCase()) {
        return false;
    }

    // Grade min filter — "5.10" means 5.10a and above
    if (filters.gradeMin) {
        const routeGrade = parseGrade(route.route?.rating || '');
        const minGrade = gradeFloor(filters.gradeMin);
        if (routeGrade === -1 || routeGrade < minGrade) return false;
    }

    // Grade max filter — "5.10" means up to 5.10d
    if (filters.gradeMax) {
        const routeGrade = parseGrade(route.route?.rating || '');
        const maxGrade = gradeCeil(filters.gradeMax);
        if (routeGrade === -1 || routeGrade > maxGrade) return false;
    }

    // Stars filter
    if (filters.minStars > 0 && route.bestStars < filters.minStars) {
        return false;
    }

    // Search filter (substring match on route name + location)
    if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (route.route?.name || '').toLowerCase();
        const location = (route.route?.location || '').toLowerCase();
        if (!name.includes(q) && !location.includes(q)) return false;
    }

    // Style filter
    if (filters.styleFilter === 'lead') {
        if (route.style !== 'Lead') return false;
    } else if (filters.styleFilter === 'lead_sends') {
        if (route.style !== 'Lead') return false;
        if (route.leadStyle === 'Fell/Hung') return false;
    }

    return true;
}
