import type { ClimbingTick, ClimbingGoal, GoalType } from './api';

export interface TickStats {
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

// YDS grade order for comparison (5.0 to 5.15d)
const GRADE_ORDER: string[] = [
    '5.0', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', '5.8', '5.9',
    '5.10a', '5.10b', '5.10c', '5.10d', '5.10',
    '5.11a', '5.11b', '5.11c', '5.11d', '5.11',
    '5.12a', '5.12b', '5.12c', '5.12d', '5.12',
    '5.13a', '5.13b', '5.13c', '5.13d', '5.13',
    '5.14a', '5.14b', '5.14c', '5.14d', '5.14',
    '5.15a', '5.15b', '5.15c', '5.15d', '5.15',
];

/**
 * Parse a YDS grade string to a numeric value for comparison
 * Returns -1 for non-YDS grades (bouldering, aid, etc.)
 */
export function parseGrade(rating: string): number {
    if (!rating) return -1;

    // Extract the base YDS grade (e.g., "5.10a" from "5.10a PG13")
    const match = rating.match(/5\.\d+[a-d]?/i);
    if (!match) return -1;

    const grade = match[0].toLowerCase();
    const index = GRADE_ORDER.indexOf(grade);

    // Handle grades without letter suffix (5.10, 5.11, etc.)
    if (index === -1) {
        // Try without the letter
        const baseMatch = rating.match(/5\.\d+/);
        if (baseMatch) {
            return GRADE_ORDER.indexOf(baseMatch[0]);
        }
    }

    return index;
}

/**
 * Check if a grade is at or above a minimum grade threshold
 */
export function isGradeAtOrAbove(rating: string, minGrade: string): boolean {
    const ratingValue = parseGrade(rating);
    const minValue = parseGrade(minGrade);

    if (ratingValue === -1 || minValue === -1) return false;
    return ratingValue >= minValue;
}

/**
 * Get the display-friendly grade from a rating string
 */
export function extractGrade(rating: string): string {
    if (!rating) return 'Unknown';
    const match = rating.match(/5\.\d+[a-d]?/i);
    return match ? match[0] : rating.split(' ')[0];
}

/**
 * Check if a tick counts as a redpoint (clean lead send).
 * Onsights and flashes are also redpoints. Leads with no leadStyle are assumed redpoints.
 */
export function isRedpointSend(tick: ClimbingTick): boolean {
    if (tick.style?.toLowerCase() !== 'lead') return false;
    const leadStyle = tick.leadStyle?.toLowerCase();
    return !leadStyle || leadStyle === 'redpoint' || leadStyle === 'onsight' || leadStyle === 'flash';
}

/**
 * Compute comprehensive stats from a list of climbing ticks
 */
export function computeTickStats(ticks: ClimbingTick[]): TickStats {
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

        // Count pitches (from the tick, not the route)
        const pitches = tick.pitches || 1;
        stats.totalPitches += pitches;

        // Track unique climbing days
        if (tick.tickDate) {
            uniqueDates.add(tick.tickDate);
        }

        // Lead vs follow stats
        const isLead = tick.style?.toLowerCase() === 'lead';
        if (isLead) {
            stats.leadCount++;
            stats.leadPitches += pitches;
        }

        // Lead style stats - use isRedpointSend which checks lead + clean send
        const isRedpoint = isRedpointSend(tick);
        const leadStyle = tick.leadStyle?.toLowerCase();
        if (leadStyle === 'onsight') {
            stats.onsightCount++;
            stats.flashCount++;
            stats.redpointCount++;
        } else if (leadStyle === 'flash') {
            stats.flashCount++;
            stats.redpointCount++;
        } else if (isRedpoint) {
            // Explicit redpoint or lead with no leadStyle
            stats.redpointCount++;
        }

        // Grade distribution (all routes)
        const grade = extractGrade(route.rating);
        stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;

        // Grade distribution (leads only)
        if (isLead) {
            stats.byGradeLeads[grade] = (stats.byGradeLeads[grade] || 0) + 1;
        }

        // Grade distribution (redpoints only - includes onsight and flash)
        if (isRedpoint) {
            stats.byGradeRedpoints[grade] = (stats.byGradeRedpoints[grade] || 0) + 1;
        }

        // Track highest redpoint (includes onsight and flash as they're also clean sends)
        if (isRedpoint) {
            const gradeValue = parseGrade(route.rating);
            if (gradeValue > highestRedpointValue) {
                highestRedpointValue = gradeValue;
                stats.highestRedpoint = grade;
            }
        }

        // Route type distribution
        const routeType = route.routeType || 'Unknown';
        stats.byRouteType[routeType] = (stats.byRouteType[routeType] || 0) + 1;

        // Single vs multipitch
        if (pitches > 1) {
            stats.multipitchCount++;
        } else {
            stats.singlepitchCount++;
        }

        // Monthly distribution (climbs and pitches)
        if (tick.tickDate) {
            const month = tick.tickDate.substring(0, 7); // YYYY-MM
            stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
            stats.pitchesByMonth[month] = (stats.pitchesByMonth[month] || 0) + pitches;
        }

        // Area/location tracking (get first part of location)
        if (route.location) {
            const area = route.location.split(' > ')[0];
            areaCount[area] = (areaCount[area] || 0) + 1;
        }
    }

    stats.uniqueDays = uniqueDates.size;

    // Find favorite area (most climbed)
    let maxAreaCount = 0;
    for (const [area, count] of Object.entries(areaCount)) {
        if (count > maxAreaCount) {
            maxAreaCount = count;
            stats.favoriteArea = area;
        }
    }

    return stats;
}

export interface GoalProgress {
    goal: ClimbingGoal;
    current: number;
    target: number;
    percent: number;
    isComplete: boolean;
}

/**
 * Compute progress towards a climbing goal
 */
export function computeGoalProgress(goal: ClimbingGoal, ticks: ClimbingTick[]): GoalProgress {
    let current = 0;

    // Filter ticks by person if goal has a person
    let filteredTicks = ticks;
    if (goal.person?.documentId) {
        filteredTicks = ticks.filter(t => t.person?.documentId === goal.person?.documentId);
    }

    // Filter by year
    filteredTicks = filteredTicks.filter(t => {
        if (!t.tickDate) return false;
        const tickYear = parseInt(t.tickDate.substring(0, 4));
        return tickYear === goal.year;
    });

    // Apply minGrade and routeType filters when set on the goal (applies to all goal types)
    if (goal.minGrade) {
        filteredTicks = filteredTicks.filter(t => isGradeAtOrAbove(t.route?.rating || '', goal.minGrade!));
    }
    if (goal.routeType) {
        filteredTicks = filteredTicks.filter(t => t.route?.routeType?.toLowerCase() === goal.routeType!.toLowerCase());
    }

    switch (goal.goalType) {
        case 'lead_pitches':
            current = filteredTicks
                .filter(t => t.style?.toLowerCase() === 'lead')
                .reduce((sum, t) => sum + (t.pitches || 1), 0);
            break;

        case 'lead_climbs':
            current = filteredTicks
                .filter(t => t.style?.toLowerCase() === 'lead')
                .length;
            break;

        case 'redpoints':
            current = filteredTicks
                .filter(t => isRedpointSend(t))
                .length;
            break;

        case 'onsights':
            current = filteredTicks
                .filter(t => t.leadStyle?.toLowerCase() === 'onsight')
                .length;
            break;

        case 'grade_target':
            current = filteredTicks
                .filter(t => isRedpointSend(t))
                .length;
            break;
    }

    const percent = Math.min(100, Math.round((current / goal.targetCount) * 100));

    return {
        goal,
        current,
        target: goal.targetCount,
        percent,
        isComplete: current >= goal.targetCount,
    };
}

/**
 * Get a sorted array of grades for pyramid display
 * Returns grades sorted from highest to lowest
 */
export function getSortedGrades(byGrade: Record<string, number>): Array<{ grade: string; count: number }> {
    return Object.entries(byGrade)
        .map(([grade, count]) => ({ grade, count }))
        .sort((a, b) => parseGrade(b.grade) - parseGrade(a.grade));
}

export interface ActivityData {
    label: string;
    climbs: number;
    pitches: number;
}

/**
 * Get monthly activity data for a specific year
 */
export function getMonthlyActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>, year: number): ActivityData[] {
    const months: ActivityData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let m = 0; m < 12; m++) {
        const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
        months.push({
            label: monthNames[m],
            climbs: byMonth[monthKey] || 0,
            pitches: pitchesByMonth[monthKey] || 0,
        });
    }

    return months;
}

/**
 * Get monthly activity data for the last 12 months
 */
export function getLast12MonthsActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>): ActivityData[] {
    const months: ActivityData[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.push({
            label: monthNames[date.getMonth()],
            climbs: byMonth[monthKey] || 0,
            pitches: pitchesByMonth[monthKey] || 0,
        });
    }

    return months;
}

/**
 * Get yearly activity data from monthly data
 */
export function getYearlyActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>): ActivityData[] {
    const climbsByYear: Record<string, number> = {};
    const pitchesByYear: Record<string, number> = {};

    // Aggregate monthly data into years
    for (const [monthKey, count] of Object.entries(byMonth)) {
        const year = monthKey.substring(0, 4);
        climbsByYear[year] = (climbsByYear[year] || 0) + count;
    }

    for (const [monthKey, count] of Object.entries(pitchesByMonth)) {
        const year = monthKey.substring(0, 4);
        pitchesByYear[year] = (pitchesByYear[year] || 0) + count;
    }

    // Sort years and return as array
    return Object.keys(climbsByYear)
        .sort()
        .map(year => ({
            label: year,
            climbs: climbsByYear[year] || 0,
            pitches: pitchesByYear[year] || 0,
        }));
}
