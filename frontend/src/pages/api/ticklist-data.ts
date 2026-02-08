import type { APIRoute } from 'astro';
import {
    fetchAllClimbingTicks,
    fetchClimbingTicksForPerson,
    fetchClimbingTicksLast12Months,
    fetchClimbingTicksLast12MonthsForPerson,
    fetchClimbingGoals,
    fetchAllPeople,
    type ClimbingTick,
    type ClimbingGoal,
    type Person,
} from '../../lib/api';

// Grade ordering for comparisons
const GRADE_ORDER = [
    '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
    '5.10a', '5.10b', '5.10c', '5.10d', '5.10',
    '5.11a', '5.11b', '5.11c', '5.11d', '5.11',
    '5.12a', '5.12b', '5.12c', '5.12d', '5.12',
    '5.13a', '5.13b', '5.13c', '5.13d', '5.13',
    '5.14a', '5.14b', '5.14c', '5.14d', '5.14',
    '5.15a', '5.15b', '5.15c', '5.15d', '5.15',
];

function parseGrade(rating: string): number {
    if (!rating) return -1;
    const match = rating.match(/5\.\d+[a-d]?/i);
    if (!match) return -1;
    const grade = match[0].toLowerCase();
    const index = GRADE_ORDER.indexOf(grade);
    if (index === -1) {
        const baseMatch = rating.match(/5\.\d+/);
        if (baseMatch) return GRADE_ORDER.indexOf(baseMatch[0]);
    }
    return index;
}

function extractGrade(rating: string): string {
    if (!rating) return 'Unknown';
    const match = rating.match(/5\.\d+[a-d]?/i);
    return match ? match[0] : rating.split(' ')[0];
}

function isGradeAtOrAbove(rating: string, minGrade: string): boolean {
    const ratingValue = parseGrade(rating);
    const minValue = parseGrade(minGrade);
    if (ratingValue === -1 || minValue === -1) return false;
    return ratingValue >= minValue;
}

interface TickStats {
    totalTicks: number;
    totalPitches: number;
    leadCount: number;
    leadPitches: number;
    redpointCount: number;
    onsightCount: number;
    flashCount: number;
    byGrade: Record<string, number>;
    byGradeLeads: Record<string, number>;
    byGradeRedpoints: Record<string, number>;
    byRouteType: Record<string, number>;
    byMonth: Record<string, number>;
    pitchesByMonth: Record<string, number>;
    multipitchCount: number;
    singlepitchCount: number;
    uniqueDays: number;
    highestRedpoint: string;
    favoriteArea: string;
}

interface GoalProgress {
    goal: ClimbingGoal;
    current: number;
    target: number;
    percent: number;
    isComplete: boolean;
}

interface GroupedRoute {
    route: ClimbingTick['route'] | null;
    climbers: string[];
    bestStars: number;
    photos: ClimbingTick['photos'];
    notes: string[];
    style?: string;
    leadStyle?: string;
    pitches: number;
}

interface TicksByDate {
    date: string;
    formattedDate: string;
    routes: GroupedRoute[];
}

function computeTickStats(ticks: ClimbingTick[]): TickStats {
    const stats: TickStats = {
        totalTicks: ticks.length,
        totalPitches: 0,
        leadCount: 0,
        leadPitches: 0,
        redpointCount: 0,
        onsightCount: 0,
        flashCount: 0,
        byGrade: {},
        byGradeLeads: {},
        byGradeRedpoints: {},
        byRouteType: {},
        byMonth: {},
        pitchesByMonth: {},
        multipitchCount: 0,
        singlepitchCount: 0,
        uniqueDays: 0,
        highestRedpoint: '',
        favoriteArea: '',
    };

    const uniqueDates = new Set<string>();
    const areaCount: Record<string, number> = {};
    let highestRedpointValue = -1;

    for (const tick of ticks) {
        const route = tick.route;
        if (!route) continue;

        const pitches = tick.pitches || 1;
        stats.totalPitches += pitches;

        if (tick.tickDate) uniqueDates.add(tick.tickDate);

        const isLead = tick.style?.toLowerCase() === 'lead';
        if (isLead) {
            stats.leadCount++;
            stats.leadPitches += pitches;
        }

        const leadStyle = tick.leadStyle?.toLowerCase();
        const isRedpoint = leadStyle === 'redpoint' || leadStyle === 'onsight' || leadStyle === 'flash' || (isLead && !leadStyle);
        if (leadStyle === 'redpoint') stats.redpointCount++;
        if (leadStyle === 'onsight') stats.onsightCount++;
        if (leadStyle === 'flash') stats.flashCount++;

        const grade = extractGrade(route.rating);
        stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;

        if (isLead) {
            stats.byGradeLeads[grade] = (stats.byGradeLeads[grade] || 0) + 1;
        }

        if (isRedpoint) {
            stats.byGradeRedpoints[grade] = (stats.byGradeRedpoints[grade] || 0) + 1;
            const gradeValue = parseGrade(route.rating);
            if (gradeValue > highestRedpointValue) {
                highestRedpointValue = gradeValue;
                stats.highestRedpoint = grade;
            }
        }

        const routeType = route.routeType || 'Unknown';
        stats.byRouteType[routeType] = (stats.byRouteType[routeType] || 0) + 1;

        if (pitches > 1) stats.multipitchCount++;
        else stats.singlepitchCount++;

        if (tick.tickDate) {
            const month = tick.tickDate.substring(0, 7);
            stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
            stats.pitchesByMonth[month] = (stats.pitchesByMonth[month] || 0) + pitches;
        }

        if (route.location) {
            const area = route.location.split(' > ')[0];
            areaCount[area] = (areaCount[area] || 0) + 1;
        }
    }

    stats.uniqueDays = uniqueDates.size;

    let maxAreaCount = 0;
    for (const [area, count] of Object.entries(areaCount)) {
        if (count > maxAreaCount) {
            maxAreaCount = count;
            stats.favoriteArea = area;
        }
    }

    return stats;
}

function computeGoalProgress(goal: ClimbingGoal, ticks: ClimbingTick[]): GoalProgress {
    let current = 0;
    let filteredTicks = ticks;

    if (goal.person?.documentId) {
        filteredTicks = ticks.filter(t => t.person?.documentId === goal.person?.documentId);
    }

    filteredTicks = filteredTicks.filter(t => {
        if (!t.tickDate) return false;
        const tickYear = parseInt(t.tickDate.substring(0, 4));
        return tickYear === goal.year;
    });

    switch (goal.goalType) {
        case 'lead_pitches':
            current = filteredTicks
                .filter(t => t.style?.toLowerCase() === 'lead')
                .reduce((sum, t) => sum + (t.pitches || 1), 0);
            break;
        case 'lead_climbs':
            current = filteredTicks.filter(t => t.style?.toLowerCase() === 'lead').length;
            break;
        case 'redpoints':
            current = filteredTicks.filter(t => t.leadStyle?.toLowerCase() === 'redpoint').length;
            break;
        case 'onsights':
            current = filteredTicks.filter(t => t.leadStyle?.toLowerCase() === 'onsight').length;
            break;
        case 'grade_target':
            current = filteredTicks.filter(t => {
                if (goal.minGrade && !isGradeAtOrAbove(t.route?.rating || '', goal.minGrade)) return false;
                if (goal.routeType && t.route?.routeType?.toLowerCase() !== goal.routeType.toLowerCase()) return false;
                return true;
            }).length;
            break;
    }

    const percent = Math.min(100, Math.round((current / goal.targetCount) * 100));
    return { goal, current, target: goal.targetCount, percent, isComplete: current >= goal.targetCount };
}

function groupTicksByDateAndRoute(ticks: ClimbingTick[]): TicksByDate[] {
    const byDate = new Map<string, Map<string, GroupedRoute>>();

    for (const tick of ticks) {
        const date = tick.tickDate;
        if (!date) continue;
        const routeUrl = tick.route?.mountainProjectUrl || 'unknown';
        const groupKey = `${routeUrl}|${tick.style || ''}|${tick.leadStyle || ''}`;

        if (!byDate.has(date)) byDate.set(date, new Map());
        const dateRoutes = byDate.get(date)!;

        if (!dateRoutes.has(groupKey)) {
            dateRoutes.set(groupKey, {
                route: tick.route || null,
                climbers: [],
                bestStars: 0,
                photos: [],
                notes: [],
                style: tick.style,
                leadStyle: tick.leadStyle,
                pitches: 0,
            });
        }

        const groupedRoute = dateRoutes.get(groupKey)!;
        groupedRoute.pitches += tick.pitches || 1;

        if (tick.person?.name && !groupedRoute.climbers.includes(tick.person.name)) {
            groupedRoute.climbers.push(tick.person.name);
        }

        if (tick.yourStars && tick.yourStars > groupedRoute.bestStars) {
            groupedRoute.bestStars = tick.yourStars;
        }

        if (tick.photos?.length) {
            for (const photo of tick.photos) {
                if (!groupedRoute.photos?.some(p => p.id === photo.id)) {
                    groupedRoute.photos = groupedRoute.photos || [];
                    groupedRoute.photos.push(photo);
                }
            }
        }

        if (tick.notes && !groupedRoute.notes.includes(tick.notes)) {
            groupedRoute.notes.push(tick.notes);
        }
    }

    return Array.from(byDate.entries()).map(([date, routesMap]) => ({
        date,
        formattedDate: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        }),
        routes: Array.from(routesMap.values()),
    }));
}

function getSortedGrades(byGrade: Record<string, number>): Array<{ grade: string; count: number }> {
    return Object.entries(byGrade)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => parseGrade(b.grade) - parseGrade(a.grade));
}

export const GET: APIRoute = async ({ url, locals }) => {
    const personId = url.searchParams.get('person') || undefined;
    const yearParam = url.searchParams.get('year');
    const period = url.searchParams.get('period') || 'last12'; // 'last12' | 'year' | 'all'

    const currentYear = new Date().getFullYear();
    const selectedYear = yearParam === 'all' ? undefined : (yearParam ? parseInt(yearParam, 10) : undefined);
    const showAllTime = yearParam === 'all';
    const showLast12Months = period === 'last12' && !selectedYear && !showAllTime;

    try {
        // Fetch ticks based on filters
        let ticks: ClimbingTick[];
        if (personId) {
            if (showLast12Months) {
                ticks = await fetchClimbingTicksLast12MonthsForPerson(personId, locals);
            } else {
                ticks = await fetchClimbingTicksForPerson(personId, selectedYear, locals);
            }
        } else {
            if (showLast12Months) {
                ticks = await fetchClimbingTicksLast12Months(locals);
            } else {
                ticks = await fetchAllClimbingTicks(selectedYear, locals);
            }
        }

        // Fetch people for the filter dropdown
        const people = await fetchAllPeople(locals);

        // Compute stats
        const stats = computeTickStats(ticks);

        // Compute grade pyramids
        const gradeDataAll = getSortedGrades(stats.byGrade);
        const gradeDataLeads = getSortedGrades(stats.byGradeLeads);
        const gradeDataRedpoints = getSortedGrades(stats.byGradeRedpoints);

        // Fetch and compute goals
        let goals: GoalProgress[] = [];
        const goalYear = selectedYear || currentYear;

        if (personId) {
            // Single person view - fetch their goals
            const rawGoals = await fetchClimbingGoals(personId, goalYear, locals);

            // For goals, we need ticks for the goal year
            let ticksForGoals = ticks;
            if (!selectedYear && showLast12Months) {
                // Need to fetch current year ticks for goal progress
                ticksForGoals = await fetchClimbingTicksForPerson(personId, goalYear, locals);
            }

            goals = rawGoals.map(goal => computeGoalProgress(goal, ticksForGoals));
        } else {
            // Everyone view - fetch all goals and compute progress per person
            const rawGoals = await fetchClimbingGoals(undefined, goalYear, locals);

            // We need all ticks for the goal year to compute progress
            let allTicksForGoals: ClimbingTick[];
            if (selectedYear === goalYear || showAllTime) {
                allTicksForGoals = ticks;
            } else {
                // Fetch ticks for the goal year
                allTicksForGoals = await fetchAllClimbingTicks(goalYear, locals);
            }

            // Compute progress for each goal using only that person's ticks
            goals = rawGoals.map(goal => {
                const personTicks = goal.person
                    ? allTicksForGoals.filter(t => t.person?.documentId === goal.person?.documentId)
                    : [];
                return computeGoalProgress(goal, personTicks);
            });
        }

        // Group ticks by date and route
        const ticksByDate = groupTicksByDateAndRoute(ticks);

        const response = {
            ticks: ticksByDate,
            stats,
            gradePyramid: {
                all: gradeDataAll,
                leads: gradeDataLeads,
                redpoints: gradeDataRedpoints,
            },
            goals,
            people,
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('Error fetching ticklist data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch ticklist data' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};
