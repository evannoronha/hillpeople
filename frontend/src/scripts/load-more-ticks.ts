// Load more climbing ticks handler

interface TickRoute {
    name: string;
    rating: string;
    routeType: string;
    location: string;
    mountainProjectUrl: string;
}

interface TickPerson {
    name: string;
}

interface TickData {
    documentId: string;
    tickDate: string;
    style: string;
    leadStyle: string;
    yourStars: number;
    route: TickRoute | null;
    person: TickPerson | null;
}

interface GroupedRoute {
    route: TickRoute | null;
    climbers: string[];
    bestStars: number;
}

interface ApiResponse {
    ticks: TickData[];
    pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
    };
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function groupTicksByRoute(ticks: TickData[]): Map<string, GroupedRoute> {
    const routeMap = new Map<string, GroupedRoute>();

    for (const tick of ticks) {
        const routeUrl = tick.route?.mountainProjectUrl || 'unknown';

        if (!routeMap.has(routeUrl)) {
            routeMap.set(routeUrl, {
                route: tick.route,
                climbers: [],
                bestStars: 0,
            });
        }

        const groupedRoute = routeMap.get(routeUrl)!;

        if (tick.person?.name && !groupedRoute.climbers.includes(tick.person.name)) {
            groupedRoute.climbers.push(tick.person.name);
        }

        if (tick.yourStars && tick.yourStars > groupedRoute.bestStars) {
            groupedRoute.bestStars = tick.yourStars;
        }
    }

    return routeMap;
}

function createRouteHtml(groupedRoute: GroupedRoute): string {
    const routeName = groupedRoute.route?.name || "Unknown Route";
    const routeUrl = groupedRoute.route?.mountainProjectUrl || "#";
    const rating = groupedRoute.route?.rating || "";
    const routeType = groupedRoute.route?.routeType || "";
    const location = groupedRoute.route?.location || "";
    const climbers = groupedRoute.climbers.join(" & ");

    const starsHtml = groupedRoute.bestStars > 0
        ? `<div class="flex-shrink-0 text-sm text-[var(--color-header)]" title="${groupedRoute.bestStars} stars">${"★".repeat(groupedRoute.bestStars)}${"☆".repeat(4 - groupedRoute.bestStars)}</div>`
        : "";

    return `
        <div class="tick-item flex items-start gap-4 p-3 rounded-lg border border-[var(--color-accent)] hover:border-[var(--color-header)] transition">
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                    <a href="${routeUrl}" target="_blank" rel="noopener noreferrer" class="font-semibold hover:underline text-[var(--color-header)]">${routeName}</a>
                    ${rating ? `<span class="text-sm font-mono">${rating}</span>` : ""}
                    ${routeType ? `<span class="text-xs text-[var(--color-accent)]">${routeType}</span>` : ""}
                </div>
                ${location ? `<p class="text-sm truncate">${location}</p>` : ""}
                ${climbers ? `<p class="text-xs mt-1 text-[var(--color-accent)]">${climbers}</p>` : ""}
            </div>
            ${starsHtml}
        </div>
    `;
}

function createDateGroupHtml(date: string, formattedDate: string, routes: GroupedRoute[]): string {
    const routesHtml = routes.map(route => createRouteHtml(route)).join("");
    return `
        <div class="mb-8" data-date="${date}">
            <h2 class="text-xl font-semibold mb-3 sticky top-0 bg-[var(--color-bg)] py-2 border-b border-[var(--color-accent)]">
                ${formattedDate}
            </h2>
            <div class="space-y-2">
                ${routesHtml}
            </div>
        </div>
    `;
}

export function initLoadMoreTicks() {
    const button = document.getElementById('load-more-ticks') as HTMLButtonElement | null;
    const container = document.getElementById('ticks-container');

    if (!button || !container) return;

    const pageSize = parseInt(button.dataset.pageSize || '50', 10);
    let currentPage = parseInt(button.dataset.page || '2', 10);
    let isLoading = false;

    button.addEventListener('click', async () => {
        if (isLoading) return;

        isLoading = true;
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;

        try {
            const response = await fetch(`/api/climbing-ticks?page=${currentPage}&pageSize=${pageSize}`);
            const data: ApiResponse = await response.json();

            // Group ticks by date, then by route
            const ticksByDate = new Map<string, TickData[]>();
            for (const tick of data.ticks) {
                const date = tick.tickDate;
                if (!ticksByDate.has(date)) {
                    ticksByDate.set(date, []);
                }
                ticksByDate.get(date)!.push(tick);
            }

            // Process each date group
            ticksByDate.forEach((dateTicks, date) => {
                const routeMap = groupTicksByRoute(dateTicks);
                const existingGroup = container.querySelector(`[data-date="${date}"]`);

                if (existingGroup) {
                    // Merge into existing date group
                    const ticksContainer = existingGroup.querySelector('.space-y-2');
                    if (ticksContainer) {
                        // For existing groups, we need to check if routes already exist
                        routeMap.forEach((groupedRoute, routeUrl) => {
                            // Check if this route already exists in the DOM
                            const existingRouteLink = ticksContainer.querySelector(`a[href="${routeUrl}"]`);
                            if (!existingRouteLink) {
                                ticksContainer.insertAdjacentHTML('beforeend', createRouteHtml(groupedRoute));
                            }
                            // If route exists, we could update climbers, but for simplicity we skip
                        });
                    }
                } else {
                    // Create new date group with deduped routes
                    const formattedDate = formatDate(date);
                    const routes = Array.from(routeMap.values());
                    container.insertAdjacentHTML('beforeend', createDateGroupHtml(date, formattedDate, routes));
                }
            });

            currentPage++;

            // Hide button if no more pages
            if (currentPage > data.pagination.pageCount) {
                button.style.display = 'none';
            } else {
                button.textContent = originalText;
                button.disabled = false;
            }
        } catch (error) {
            console.error('Failed to load more ticks:', error);
            button.textContent = 'Failed to load. Try again.';
            button.disabled = false;
        } finally {
            isLoading = false;
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadMoreTicks);
} else {
    initLoadMoreTicks();
}
