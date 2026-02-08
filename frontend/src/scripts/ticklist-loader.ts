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
    pitches?: number;
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
function renderStatsCards(stats: TickStats, isEveryoneView: boolean): void {
    const container = document.getElementById('stats-container');
    if (!container) return;

    const cards = [
        { value: stats.totalPitches, label: 'Pitches Climbed' },
        { value: stats.leadPitches, label: 'Pitches Led' },
        { value: stats.uniqueDays, label: 'Days Out' },
        // Only show Hardest Redpoint for individual person view
        ...(!isEveryoneView ? [{ value: stats.highestRedpoint || '—', label: 'Hardest Redpoint' }] : []),
    ];

    const gridCols = isEveryoneView ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
    container.innerHTML = `
        <div class="stats-cards grid grid-cols-2 ${gridCols} gap-4 mb-8">
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

function renderCharts(
    activityData: ActivityData[],
    routeTypeData: Array<{ label: string; value: number }>,
    gradePyramidData: GradePyramidData,
    showAllTime: boolean,
    showLast12Months: boolean,
    selectedYear?: number
): void {
    // Hide skeleton when charts data is ready
    const skeleton = document.getElementById('charts-skeleton');
    const pyramidSkeleton = document.getElementById('pyramid-container');
    if (skeleton) skeleton.style.display = 'none';
    if (pyramidSkeleton) pyramidSkeleton.style.display = 'none';

    const chartsData = {
        activityData,
        routeTypeData,
        gradePyramidData,
        showAllTime,
        showLast12Months,
        selectedYear,
    };

    // Store on window so React island can access it if it mounts after the event
    (window as unknown as { __CHARTS_DATA__: typeof chartsData }).__CHARTS_DATA__ = chartsData;

    // Dispatch event for React island to receive data
    window.dispatchEvent(new CustomEvent('charts-data-update', {
        detail: chartsData
    }));
}

function renderGoalsDashboard(goals: GoalProgress[], personName?: string, goalYear?: number): void {
    const container = document.getElementById('goals-container');
    if (!container || goals.length === 0) return;

    const isEveryoneView = !personName;

    if (isEveryoneView) {
        // Group goals by person
        const goalsByPerson = new Map<string, GoalProgress[]>();
        goals.forEach(progress => {
            const name = progress.goal.person?.name || 'Unknown';
            if (!goalsByPerson.has(name)) {
                goalsByPerson.set(name, []);
            }
            goalsByPerson.get(name)!.push(progress);
        });

        // Sort each person's goals
        goalsByPerson.forEach((personGoals, name) => {
            personGoals.sort((a, b) => {
                if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
                return b.percent - a.percent;
            });
        });

        const totalCompleted = goals.filter(g => g.isComplete).length;
        const allComplete = totalCompleted === goals.length;

        container.innerHTML = `
            <div class="goals-dashboard bg-[var(--color-accent)]/5 rounded-xl p-6 mb-8">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold">${goalYear || ''} Goals</h2>
                    ${allComplete ? '<span class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">All goals complete!</span>' : ''}
                    ${!allComplete && totalCompleted > 0 ? `<span class="text-sm opacity-70">${totalCompleted} of ${goals.length} complete</span>` : ''}
                </div>
                <div class="space-y-6">
                    ${Array.from(goalsByPerson.entries()).map(([name, personGoals]) => {
                        const personCompleted = personGoals.filter(g => g.isComplete).length;
                        const personAllComplete = personCompleted === personGoals.length;
                        return `
                            <div class="person-goals">
                                <div class="flex items-center gap-2 mb-3">
                                    <h3 class="font-semibold text-[var(--color-header)]">${name}</h3>
                                    ${personAllComplete ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Complete!</span>' : ''}
                                    ${!personAllComplete && personCompleted > 0 ? `<span class="text-xs opacity-70">${personCompleted}/${personGoals.length}</span>` : ''}
                                </div>
                                <div class="goals-list space-y-2 pl-2 border-l-2 border-[var(--color-accent)]/30">
                                    ${personGoals.map(progress => `
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
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        // Single person view
        const sortedGoals = [...goals].sort((a, b) => {
            if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
            return b.percent - a.percent;
        });

        const completedCount = goals.filter(g => g.isComplete).length;
        const allComplete = completedCount === goals.length;

        container.innerHTML = `
            <div class="goals-dashboard bg-[var(--color-accent)]/5 rounded-xl p-6 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold">${personName}'s ${goalYear || ''} Goals</h2>
                    ${allComplete ? '<span class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">All goals complete!</span>' : ''}
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

    let itemIndex = 0;
    container.innerHTML = ticksByDate.map(({ date, formattedDate, routes }) => `
        <div class="tick-day mb-8" data-date="${date}">
            <h3 class="text-lg font-semibold mb-3 sticky top-0 bg-[var(--color-bg)] py-2 border-b border-[var(--color-accent)]/30">
                ${formattedDate}
            </h3>
            <div class="space-y-2">
                ${routes.map(groupedRoute => {
                    const delay = Math.min(itemIndex * 30, 500); // Cap at 500ms
                    itemIndex++;
                    return `
                    <div class="tick-item flex items-start gap-4 p-3 rounded-lg border border-[var(--color-accent)]/30 hover:border-[var(--color-header)] transition" style="animation-delay: ${delay}ms;">
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
                                ${groupedRoute.pitches && groupedRoute.pitches > 1 ? `
                                    <span class="text-xs px-2 py-0.5 rounded bg-[var(--color-header)]/20 font-semibold">
                                        ${groupedRoute.pitches}p
                                    </span>
                                ` : ''}
                            </div>
                            ${groupedRoute.route?.location ? `<p class="text-sm truncate opacity-80">${groupedRoute.route.location}</p>` : ''}
                            ${groupedRoute.climbers.length > 0 ? `<p class="text-xs mt-1 opacity-70">${groupedRoute.climbers.join(' & ')}</p>` : ''}
                            ${groupedRoute.notes.length > 0 ? `<p class="text-sm mt-2 italic opacity-80">${groupedRoute.notes.join(' · ')}</p>` : ''}
                            ${groupedRoute.photos && groupedRoute.photos.length > 0 ? `
                                <div class="photo-gallery flex gap-2 mt-2 flex-wrap">
                                    ${groupedRoute.photos.slice(0, 4).map((photo, idx) => {
                                        const thumbUrl = photo.formats?.thumbnail?.url || photo.formats?.small?.url || photo.url;
                                        const fullUrl = photo.formats?.large?.url || photo.url;
                                        const resolvedThumb = thumbUrl.startsWith('http') ? thumbUrl : strapiUrl + thumbUrl;
                                        const resolvedFull = fullUrl.startsWith('http') ? fullUrl : strapiUrl + fullUrl;
                                        return `<button type="button" class="flex-shrink-0 cursor-pointer border-0 p-0 bg-transparent" data-photo-url="${resolvedFull}" data-photo-alt="Climbing photo" data-photo-index="${idx}"><img src="${resolvedThumb}" alt="Climbing photo" class="h-16 w-16 object-cover rounded hover:opacity-80 transition" loading="lazy" /></button>`;
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
                `;}).join('')}
            </div>
        </div>
    `).join('');
}

function initTicklistLightbox(): void {
    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement;
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (!lightbox || !lightboxImage || !closeBtn || !prevBtn || !nextBtn) return;

    let currentGallery: HTMLElement | null = null;
    let currentIndex = 0;

    function getPhotos(gallery: HTMLElement) {
        return Array.from(gallery.querySelectorAll('button[data-photo-url]')) as HTMLButtonElement[];
    }

    function showPhoto(index: number) {
        if (!currentGallery) return;
        const photos = getPhotos(currentGallery);
        if (index < 0 || index >= photos.length) return;
        currentIndex = index;
        const photo = photos[index];
        lightboxImage.src = photo.dataset.photoUrl || '';
        lightboxImage.alt = photo.dataset.photoAlt || '';
        prevBtn!.classList.toggle('hidden', index === 0);
        nextBtn!.classList.toggle('hidden', index === photos.length - 1);
    }

    function openLightbox(gallery: HTMLElement, index: number) {
        currentGallery = gallery;
        showPhoto(index);
        lightbox!.classList.remove('hidden');
        lightbox!.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox!.classList.add('hidden');
        lightbox!.classList.remove('flex');
        document.body.style.overflow = '';
        currentGallery = null;
    }

    document.querySelectorAll('#ticks-container .photo-gallery button[data-photo-url]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget as HTMLButtonElement;
            const gallery = button.closest('.photo-gallery') as HTMLElement;
            const index = parseInt(button.dataset.photoIndex || '0', 10);
            openLightbox(gallery, index);
        });
    });

    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => showPhoto(currentIndex - 1));
    nextBtn.addEventListener('click', () => showPhoto(currentIndex + 1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
        if (lightbox!.classList.contains('hidden')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPhoto(currentIndex - 1);
        if (e.key === 'ArrowRight') showPhoto(currentIndex + 1);
    });
}

// Parameters for data loading
interface LoadParams {
    personId?: string;
    year?: string; // 'all', 'last12', or a year number
    personName?: string;
}

// Core data loading function
async function loadTicklistData(params: LoadParams): Promise<void> {
    const config = (window as unknown as { __TICKLIST_CONFIG__: TicklistConfig }).__TICKLIST_CONFIG__;
    if (!config) {
        console.error('Ticklist config not found');
        return;
    }

    const { strapiUrl, currentYear } = config;
    const { personId, year, personName } = params;

    // Determine time period settings
    const showAllTime = year === 'all';
    const showLast12Months = !year || year === 'last12';
    const selectedYear = (!showAllTime && !showLast12Months && year) ? parseInt(year) : undefined;

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator?.classList.remove('hidden');

    // Update header subtitle
    updateHeaderSubtitle(personName, showAllTime, showLast12Months, selectedYear);

    try {
        // Build the API URL
        const apiParams = new URLSearchParams();
        if (personId) {
            apiParams.set('person', personId);
        }
        if (showAllTime) {
            apiParams.set('year', 'all');
        } else if (selectedYear) {
            apiParams.set('year', String(selectedYear));
        } else if (showLast12Months) {
            apiParams.set('period', 'last12');
        }

        const apiUrl = `/api/ticklist-data?${apiParams.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const data: TicklistDataResponse = await response.json();
        const { ticks, stats, gradePyramid, goals } = data;

        // Render stats cards
        if (stats.totalTicks > 0) {
            renderStatsCards(stats, !personId);
        } else {
            const statsContainer = document.getElementById('stats-container');
            if (statsContainer) statsContainer.innerHTML = '';
        }

        // Prepare and render charts with React
        if (stats.totalTicks > 0) {
            const activityData = selectedYear
                ? getMonthlyActivity(stats.byMonth, stats.pitchesByMonth, selectedYear)
                : showLast12Months
                    ? getLast12MonthsActivity(stats.byMonth, stats.pitchesByMonth)
                    : getYearlyActivity(stats.byMonth, stats.pitchesByMonth);

            const routeTypeData = Object.entries(stats.byRouteType).map(([label, value]) => ({ label, value }));

            renderCharts(activityData, routeTypeData, gradePyramid, showAllTime, showLast12Months, selectedYear);
        } else {
            // Clear charts if no data - dispatch empty data
            window.dispatchEvent(new CustomEvent('charts-data-update', {
                detail: null
            }));
        }

        // Render goals if available
        const goalsContainer = document.getElementById('goals-container');
        if (goals.length > 0) {
            const goalYear = selectedYear || currentYear;
            renderGoalsDashboard(goals, personName, goalYear);
        } else if (goalsContainer) {
            goalsContainer.innerHTML = '';
        }

        // Update sends header
        updateSendsHeader(showAllTime, showLast12Months, selectedYear);

        // Render tick list
        renderTickList(ticks, strapiUrl);
        initTicklistLightbox();

    } catch (error) {
        console.error('Error loading ticklist data:', error);
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>Error loading data. Please try again.</p>
                </div>
            `;
        }
    } finally {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator?.classList.add('hidden');
    }
}

// Update header subtitle when filters change
function updateHeaderSubtitle(personName?: string, showAllTime?: boolean, showLast12Months?: boolean, selectedYear?: number): void {
    const subtitle = document.getElementById('header-subtitle');
    if (!subtitle) return;

    let text: string;
    if (personName) {
        text = `${personName}'s ${showAllTime ? 'all-time' : showLast12Months ? 'last 12 months' : selectedYear} routes`;
    } else {
        text = showAllTime ? 'All-time routes' : showLast12Months ? 'Last 12 months' : `${selectedYear} routes`;
    }
    subtitle.textContent = text;
}

// Update sends section header
function updateSendsHeader(showAllTime?: boolean, showLast12Months?: boolean, selectedYear?: number): void {
    const header = document.getElementById('sends-header');
    if (!header) return;

    const routeCount = document.getElementById('route-count');
    const countText = routeCount?.textContent || '';

    header.innerHTML = `${showAllTime ? 'All' : showLast12Months ? 'Recent' : selectedYear} Sends <span id="route-count" class="text-lg font-normal opacity-70 ml-2">${countText}</span>`;
}

// Get person name from the dropdown
function getPersonNameFromDropdown(personId: string): string | undefined {
    const personFilter = document.getElementById('person-filter') as HTMLSelectElement;
    if (!personFilter || !personId) return undefined;
    const option = personFilter.querySelector(`option[value="${personId}"]`) as HTMLOptionElement;
    return option?.textContent?.trim();
}

// Main initialization
async function initTicklist() {
    const config = (window as unknown as { __TICKLIST_CONFIG__: TicklistConfig }).__TICKLIST_CONFIG__;
    if (!config) {
        console.error('Ticklist config not found');
        return;
    }

    const { selectedPersonId, selectedYear, showAllTime, showLast12Months, selectedPersonName } = config;

    // Determine year parameter
    let year: string | undefined;
    if (showAllTime) {
        year = 'all';
    } else if (selectedYear) {
        year = String(selectedYear);
    } else if (showLast12Months) {
        year = 'last12';
    }

    await loadTicklistData({
        personId: selectedPersonId,
        year,
        personName: selectedPersonName,
    });
}

// Handle filter changes without page reload
function handleFilterChange(event: CustomEvent<{ personId: string; year: string }>) {
    const { personId, year } = event.detail;
    const personName = getPersonNameFromDropdown(personId);

    loadTicklistData({ personId: personId || undefined, year, personName });
}

// Cleanup function for page transitions
function cleanup() {
    // Remove filter change listener
    window.removeEventListener('ticklist-filter-change', handleFilterChange as EventListener);
}

// Initialize on page load
initTicklist();

// Listen for filter changes
window.addEventListener('ticklist-filter-change', handleFilterChange as EventListener);

// Handle Astro page transitions
document.addEventListener('astro:page-load', () => {
    initTicklist();
    window.addEventListener('ticklist-filter-change', handleFilterChange as EventListener);
});
document.addEventListener('astro:before-preparation', cleanup);
