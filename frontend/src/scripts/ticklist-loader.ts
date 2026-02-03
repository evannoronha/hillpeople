// Client-side data loader for The Ticklist page
// Fetches pre-computed data from /api/ticklist-data and renders UI components

interface TicklistConfig {
    strapiUrl: string; // Still needed for image URLs
    selectedPersonId?: string;
    selectedYear?: number;
    showAllTime: boolean;
    showLast12Months: boolean;
    currentYear: number;
    selectedPersonName?: string;
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

interface ActivityData {
    label: string;
    climbs: number;
    pitches: number;
}

interface ClimbingGoal {
    id: number;
    documentId: string;
    title: string;
    year: number;
    goalType: string;
    targetCount: number;
    minGrade?: string;
    routeType?: string;
    isActive: boolean;
    person?: { documentId: string; name: string };
}

interface GoalProgress {
    goal: ClimbingGoal;
    current: number;
    target: number;
    percent: number;
    isComplete: boolean;
}

interface GroupedRoute {
    route: {
        documentId?: string;
        name: string;
        rating: string;
        routeType?: string;
        pitches?: number;
        location?: string;
        mountainProjectUrl?: string;
    } | null;
    climbers: string[];
    bestStars: number;
    photos?: Array<{
        id: number;
        url: string;
        formats?: {
            small?: { url: string };
            medium?: { url: string };
            thumbnail?: { url: string };
        };
    }>;
    notes: string[];
    style?: string;
    leadStyle?: string;
}

interface TicksByDate {
    date: string;
    formattedDate: string;
    routes: GroupedRoute[];
}

interface GradePyramidData {
    all: Array<{ grade: string; count: number }>;
    leads: Array<{ grade: string; count: number }>;
    redpoints: Array<{ grade: string; count: number }>;
}

interface Person {
    id: number;
    documentId: string;
    name: string;
}

interface TicklistDataResponse {
    ticks: TicksByDate[];
    stats: TickStats;
    gradePyramid: GradePyramidData;
    goals: GoalProgress[];
    people: Person[];
}

// Activity data formatting functions
function getMonthlyActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>, year: number): ActivityData[] {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from({ length: 12 }, (_, m) => {
        const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
        return { label: monthNames[m], climbs: byMonth[monthKey] || 0, pitches: pitchesByMonth[monthKey] || 0 };
    });
}

function getLast12MonthsActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>): ActivityData[] {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return { label: monthNames[date.getMonth()], climbs: byMonth[monthKey] || 0, pitches: pitchesByMonth[monthKey] || 0 };
    });
}

function getYearlyActivity(byMonth: Record<string, number>, pitchesByMonth: Record<string, number>): ActivityData[] {
    const climbsByYear: Record<string, number> = {};
    const pitchesByYear: Record<string, number> = {};

    for (const [monthKey, count] of Object.entries(byMonth)) {
        const year = monthKey.substring(0, 4);
        climbsByYear[year] = (climbsByYear[year] || 0) + count;
    }
    for (const [monthKey, count] of Object.entries(pitchesByMonth)) {
        const year = monthKey.substring(0, 4);
        pitchesByYear[year] = (pitchesByYear[year] || 0) + count;
    }

    return Object.keys(climbsByYear).sort().map(year => ({
        label: year,
        climbs: climbsByYear[year] || 0,
        pitches: pitchesByYear[year] || 0,
    }));
}

// Rendering functions
function renderStatsCards(stats: TickStats): void {
    const container = document.getElementById('stats-container');
    if (!container) return;

    const cards = [
        { value: stats.totalTicks, label: 'Routes Climbed' },
        { value: stats.leadPitches, label: 'Lead Pitches' },
        { value: stats.uniqueDays, label: 'Days Outside' },
        { value: stats.highestRedpoint || '—', label: 'Highest Redpoint' },
    ];

    container.innerHTML = `
        <div class="stats-cards grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            ${cards.map((card, i) => `
                <div class="stat-card bg-[var(--color-accent)]/10 rounded-lg p-4 text-center transition-transform hover:scale-105" style="--card-index: ${i};">
                    <div class="text-2xl font-bold text-[var(--color-header)]">${card.value}</div>
                    <div class="text-sm opacity-70">${card.label}</div>
                </div>
            `).join('')}
        </div>
        ${stats.favoriteArea ? `
            <div class="favorite-area text-center mb-8 opacity-80">
                Most climbed area: <strong>${stats.favoriteArea}</strong>
            </div>
        ` : ''}
    `;
}

function renderBarChart(data: ActivityData[], title: string): void {
    const container = document.getElementById('charts-container');
    if (!container) return;

    const chartCard = container.querySelector('.chart-card:first-child');
    if (!chartCard) return;

    const maxPitches = Math.max(...data.map(d => d.pitches), 1);
    const maxClimbs = Math.max(...data.map(d => d.climbs), 1);
    const barColor = 'var(--color-header)';

    chartCard.innerHTML = `
        <div class="bar-chart-container" data-mode="pitches" style="display: flex; flex-direction: column; height: 100%;">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 class="text-lg font-semibold">${title}</h3>
                <div class="bar-chart-toggle flex gap-1 text-xs" role="group">
                    <button type="button" class="bar-toggle-btn active px-2 py-1 rounded" data-mode="pitches">Pitches</button>
                    <button type="button" class="bar-toggle-btn px-2 py-1 rounded" data-mode="climbs">Climbs</button>
                </div>
            </div>
            <div class="bar-chart" style="position: relative; flex: 1; min-height: 220px;">
                <div class="chart-grid" style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 30px; pointer-events: none; opacity: 0.3;">
                    <div style="border-bottom: 1px solid currentColor;"></div>
                    <div style="border-bottom: 1px solid currentColor;"></div>
                    <div style="border-bottom: 1px solid currentColor;"></div>
                </div>
                <div class="bars-group pitches-bars" style="position: absolute; top: 0; left: 0; right: 0; bottom: 30px; display: grid; grid-auto-columns: 1fr; grid-auto-flow: column; gap: 4px; overflow: visible;">
                    ${data.map(point => {
                        const heightPercent = maxPitches > 0 ? (point.pitches / maxPitches) * 100 : 0;
                        return `<div class="bar-column" style="height: 100%; display: flex; align-items: flex-end; overflow: visible;">
                            <div class="bar" style="width: 100%; height: ${heightPercent}%; background-color: ${barColor}; min-height: 4px; border-radius: 4px 4px 0 0; position: relative; cursor: pointer; overflow: visible;">
                                <span class="bar-tooltip">${point.pitches} pitches</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="bars-group climbs-bars" style="position: absolute; top: 0; left: 0; right: 0; bottom: 30px; display: none; grid-auto-columns: 1fr; grid-auto-flow: column; gap: 4px; overflow: visible;">
                    ${data.map(point => {
                        const heightPercent = maxClimbs > 0 ? (point.climbs / maxClimbs) * 100 : 0;
                        return `<div class="bar-column" style="height: 100%; display: flex; align-items: flex-end; overflow: visible;">
                            <div class="bar" style="width: 100%; height: ${heightPercent}%; background-color: ${barColor}; min-height: 4px; border-radius: 4px 4px 0 0; position: relative; cursor: pointer; overflow: visible;">
                                <span class="bar-tooltip">${point.climbs} climbs</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="x-labels" style="position: absolute; bottom: 0; left: 0; right: 0; display: flex;">
                    ${data.map(point => `<span style="flex: 1; text-align: center; font-size: 0.75rem; opacity: 0.7;">${point.label}</span>`).join('')}
                </div>
            </div>
        </div>
    `;

    // Add toggle functionality
    const toggleBtns = chartCard.querySelectorAll('.bar-toggle-btn');
    const pitchesBars = chartCard.querySelector('.pitches-bars') as HTMLElement;
    const climbsBars = chartCard.querySelector('.climbs-bars') as HTMLElement;

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            toggleBtns.forEach(b => b.classList.toggle('active', b === btn));
            if (pitchesBars && climbsBars) {
                pitchesBars.style.display = mode === 'pitches' ? 'grid' : 'none';
                climbsBars.style.display = mode === 'climbs' ? 'grid' : 'none';
            }
        });
    });
}

function renderDonutChart(data: Array<{ label: string; value: number }>, title: string): void {
    const container = document.getElementById('charts-container');
    if (!container) return;

    const chartCard = container.querySelector('.chart-card:last-child');
    if (!chartCard) return;

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = [
        'var(--color-header)', '#a8a29e', 'var(--color-accent)',
        '#78716c', '#d6d3d1', '#57534e', '#e7e5e4'
    ];

    // Create SVG donut
    let cumulativePercent = 0;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    const segments = data.slice(0, 7).map((item, i) => {
        const percent = total > 0 ? item.value / total : 0;
        const offset = cumulativePercent * circumference;
        const length = percent * circumference;
        cumulativePercent += percent;
        return `<circle cx="80" cy="80" r="${radius}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="20"
            stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)" />`;
    }).join('');

    chartCard.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">${title}</h3>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div class="relative">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    ${segments}
                </svg>
                <div class="absolute inset-0 flex items-center justify-center flex-col">
                    <span class="text-2xl font-bold">${total}</span>
                    <span class="text-xs opacity-70">total</span>
                </div>
            </div>
            <div class="flex flex-col gap-1 text-sm">
                ${data.slice(0, 12).map((item, i) => `
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${colors[i % colors.length]};"></span>
                        <span>${item.label}</span>
                        <span class="opacity-70">(${item.value})</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderGradePyramid(gradePyramid: GradePyramidData): void {
    const container = document.getElementById('pyramid-container');
    if (!container) return;

    const colors = [
        'var(--color-header)', '#d6d3d1', 'var(--color-accent)',
        '#a8a29e', '#78716c', '#57534e', '#e7e5e4'
    ];

    const modes = {
        redpoints: gradePyramid.redpoints,
        leads: gradePyramid.leads,
        allRoutes: gradePyramid.all
    };
    let currentMode = 'redpoints';

    function renderBars(data: Array<{ grade: string; count: number }>) {
        const maxValue = Math.max(...data.map(d => d.count), 1);
        const barsContainer = container?.querySelector('.pyramid-bars');
        if (!barsContainer) return;

        barsContainer.innerHTML = data.slice(0, 15).map((item, i) => {
            const widthPercent = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
            return `
                <div class="flex items-center w-full gap-2 group cursor-pointer">
                    <span class="w-12 text-right text-sm font-mono opacity-80 shrink-0">${item.grade}</span>
                    <div class="flex-1 h-6 flex items-center gap-2">
                        <div class="h-full rounded-r transition-all duration-300 group-hover:opacity-80"
                            style="width: ${Math.max(widthPercent, 2)}%; background-color: ${colors[i % colors.length]}; min-width: 4px;"></div>
                        ${item.count > 0 ? `<span class="text-xs font-medium shrink-0 opacity-70">${item.count}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 class="text-lg font-semibold">Grade Pyramid</h3>
            <div class="flex gap-1 text-xs" role="group">
                <button type="button" class="pyramid-mode-btn active px-2 py-1 rounded" data-mode="redpoints" title="Lead, no falls">Hardo</button>
                <button type="button" class="pyramid-mode-btn px-2 py-1 rounded" data-mode="leads" title="All lead climbs">Normal</button>
                <button type="button" class="pyramid-mode-btn px-2 py-1 rounded" data-mode="allRoutes" title="All routes including TR">Top Rope Tough Guy</button>
            </div>
        </div>
        <div class="pyramid-bars space-y-2"></div>
    `;

    renderBars(modes[currentMode as keyof typeof modes]);

    // Add toggle functionality
    const buttons = container.querySelectorAll('.pyramid-mode-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.getAttribute('data-mode') || 'redpoints';
            buttons.forEach(b => b.classList.toggle('active', b === btn));
            renderBars(modes[currentMode as keyof typeof modes]);
        });
    });
}

function renderGoalsDashboard(goals: GoalProgress[], personName?: string, goalYear?: number): void {
    const container = document.getElementById('goals-container');
    if (!container || goals.length === 0) return;

    const sortedGoals = [...goals].sort((a, b) => {
        if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
        return b.percent - a.percent;
    });

    const completedCount = goals.filter(g => g.isComplete).length;
    const allComplete = completedCount === goals.length;

    container.innerHTML = `
        <div class="goals-dashboard bg-[var(--color-accent)]/5 rounded-xl p-6 mb-8">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold">
                    ${personName ? `${personName}'s ${goalYear || ''} Goals` : `${goalYear || ''} Goals`}
                </h2>
                ${allComplete ? '<span class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">All goals complete! 🎉</span>' : ''}
                ${!allComplete && completedCount > 0 ? `<span class="text-sm opacity-70">${completedCount} of ${goals.length} complete</span>` : ''}
            </div>
            <div class="goals-list space-y-3">
                ${sortedGoals.map(progress => `
                    <div class="progress-bar-container">
                        <div class="flex justify-between mb-1">
                            <span class="text-sm font-medium ${progress.isComplete ? 'line-through opacity-60' : ''}">${progress.goal.title}</span>
                            <span class="text-sm opacity-70">${progress.current} / ${progress.target}</span>
                        </div>
                        <div class="h-2 bg-[var(--color-accent)]/20 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-500 ${progress.isComplete ? 'bg-green-500' : 'bg-[var(--color-header)]'}"
                                style="width: ${progress.percent}%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderTickList(ticksByDate: TicksByDate[], strapiUrl: string): void {
    const container = document.getElementById('ticks-container');
    const routeCount = document.getElementById('route-count');
    const emptyState = document.getElementById('empty-state');
    if (!container) return;

    const totalRoutes = ticksByDate.reduce((sum, day) => sum + day.routes.length, 0);
    if (routeCount) routeCount.textContent = `(${totalRoutes} routes)`;

    if (ticksByDate.length === 0) {
        container.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    container.innerHTML = ticksByDate.map(({ date, formattedDate, routes }) => `
        <div class="mb-8" data-date="${date}">
            <h3 class="text-lg font-semibold mb-3 sticky top-0 bg-[var(--color-bg)] py-2 border-b border-[var(--color-accent)]/30">
                ${formattedDate}
            </h3>
            <div class="space-y-2">
                ${routes.map(groupedRoute => `
                    <div class="tick-item flex items-start gap-4 p-3 rounded-lg border border-[var(--color-accent)]/30 hover:border-[var(--color-header)] transition">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-baseline gap-2 flex-wrap">
                                <a href="${groupedRoute.route?.mountainProjectUrl || '#'}" target="_blank" rel="noopener noreferrer"
                                    class="font-semibold hover:underline text-[var(--color-header)]">
                                    ${groupedRoute.route?.name || 'Unknown Route'}
                                </a>
                                ${groupedRoute.route?.rating ? `<span class="text-sm font-mono">${groupedRoute.route.rating}</span>` : ''}
                                ${groupedRoute.route?.routeType ? `<span class="text-xs opacity-70">${groupedRoute.route.routeType}</span>` : ''}
                                ${groupedRoute.style ? `
                                    <span class="text-xs px-2 py-0.5 rounded bg-[var(--color-accent)]/20">
                                        ${groupedRoute.style}${groupedRoute.leadStyle ? ` · ${groupedRoute.leadStyle}` : ''}
                                    </span>
                                ` : ''}
                            </div>
                            ${groupedRoute.route?.location ? `<p class="text-sm truncate opacity-80">${groupedRoute.route.location}</p>` : ''}
                            ${groupedRoute.climbers.length > 0 ? `<p class="text-xs mt-1 opacity-70">${groupedRoute.climbers.join(' & ')}</p>` : ''}
                            ${groupedRoute.notes.length > 0 ? `<p class="text-sm mt-2 italic opacity-80">${groupedRoute.notes.join(' · ')}</p>` : ''}
                            ${groupedRoute.photos && groupedRoute.photos.length > 0 ? `
                                <div class="flex gap-2 mt-2 flex-wrap">
                                    ${groupedRoute.photos.slice(0, 4).map(photo => {
                                        const thumbUrl = photo.formats?.thumbnail?.url || photo.formats?.small?.url || photo.url;
                                        const fullUrl = thumbUrl.startsWith('http') ? thumbUrl : strapiUrl + thumbUrl;
                                        return `<img src="${fullUrl}" alt="" class="w-16 h-16 object-cover rounded" loading="lazy" />`;
                                    }).join('')}
                                </div>
                            ` : ''}
                        </div>
                        ${groupedRoute.bestStars > 0 ? `
                            <div class="flex-shrink-0 text-sm text-[var(--color-header)]" title="${groupedRoute.bestStars} stars">
                                ${'★'.repeat(groupedRoute.bestStars)}${'☆'.repeat(4 - groupedRoute.bestStars)}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Main initialization
async function initTicklist() {
    const config = (window as unknown as { __TICKLIST_CONFIG__: TicklistConfig }).__TICKLIST_CONFIG__;
    if (!config) {
        console.error('Ticklist config not found');
        return;
    }

    const { strapiUrl, selectedPersonId, selectedYear, showAllTime, showLast12Months, currentYear, selectedPersonName } = config;

    try {
        // Build the API URL for our cached endpoint
        const params = new URLSearchParams();
        if (selectedPersonId) {
            params.set('person', selectedPersonId);
        }
        if (showAllTime) {
            params.set('year', 'all');
        } else if (selectedYear) {
            params.set('year', String(selectedYear));
        } else if (showLast12Months) {
            params.set('period', 'last12');
        }

        const apiUrl = `/api/ticklist-data?${params.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data: TicklistDataResponse = await response.json();
        const { ticks, stats, gradePyramid, goals } = data;

        // Render stats cards
        if (stats.totalTicks > 0) {
            renderStatsCards(stats);
        } else {
            const statsContainer = document.getElementById('stats-container');
            if (statsContainer) statsContainer.innerHTML = '';
        }

        // Prepare and render charts
        if (stats.totalTicks > 0) {
            const activityData = selectedYear
                ? getMonthlyActivity(stats.byMonth, stats.pitchesByMonth, selectedYear)
                : showLast12Months
                    ? getLast12MonthsActivity(stats.byMonth, stats.pitchesByMonth)
                    : getYearlyActivity(stats.byMonth, stats.pitchesByMonth);

            const chartTitle = showAllTime ? 'Yearly Activity' : 'Monthly Activity';
            renderBarChart(activityData, chartTitle);

            const routeTypeData = Object.entries(stats.byRouteType).map(([label, value]) => ({ label, value }));
            renderDonutChart(routeTypeData, 'Route Types');

            renderGradePyramid(gradePyramid);
        } else {
            const chartsContainer = document.getElementById('charts-container');
            const pyramidContainer = document.getElementById('pyramid-container');
            if (chartsContainer) chartsContainer.innerHTML = '';
            if (pyramidContainer) pyramidContainer.innerHTML = '';
        }

        // Render goals if available
        if (goals.length > 0) {
            const goalYear = selectedYear || currentYear;
            renderGoalsDashboard(goals, selectedPersonName, goalYear);
        }

        // Render tick list
        renderTickList(ticks, strapiUrl);

    } catch (error) {
        console.error('Error loading ticklist data:', error);
        // Show error state
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Error loading data. Please try again.</p>
                </div>
            `;
        }
    }
}

// Initialize on page load
initTicklist();
document.addEventListener('astro:page-load', initTicklist);
