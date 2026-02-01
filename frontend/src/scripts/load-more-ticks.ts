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

interface ApiResponse {
    ticks: TickData[];
    pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
    };
}

function formatStyle(style: string, leadStyle: string): string {
    const parts: string[] = [];
    if (style) parts.push(style);
    if (leadStyle) parts.push(leadStyle);
    return parts.join(" · ");
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function createTickHtml(tick: TickData): string {
    const routeName = tick.route?.name || "Unknown Route";
    const routeUrl = tick.route?.mountainProjectUrl || "#";
    const rating = tick.route?.rating || "";
    const routeType = tick.route?.routeType || "";
    const location = tick.route?.location || "";
    const style = formatStyle(tick.style, tick.leadStyle);
    const personName = tick.person?.name || "";

    const starsHtml = tick.yourStars && tick.yourStars > 0
        ? `<div class="flex-shrink-0 text-sm" title="${tick.yourStars} stars">${"★".repeat(tick.yourStars)}${"☆".repeat(4 - tick.yourStars)}</div>`
        : "";

    return `
        <div class="tick-item flex items-start gap-4 p-3 rounded-lg bg-[var(--color-inverse-bg)] bg-opacity-10 hover:bg-opacity-20 transition">
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                    <a href="${routeUrl}" target="_blank" rel="noopener noreferrer" class="font-semibold hover:underline">${routeName}</a>
                    ${rating ? `<span class="text-sm font-mono opacity-75">${rating}</span>` : ""}
                    ${routeType ? `<span class="text-xs opacity-60">${routeType}</span>` : ""}
                </div>
                ${location ? `<p class="text-sm opacity-60 truncate">${location}</p>` : ""}
                ${style ? `<p class="text-sm opacity-75 mt-1">${style}</p>` : ""}
                ${personName ? `<p class="text-xs opacity-50 mt-1">Climbed by ${personName}</p>` : ""}
            </div>
            ${starsHtml}
        </div>
    `;
}

function createDateGroupHtml(date: string, formattedDate: string, ticks: TickData[]): string {
    const ticksHtml = ticks.map(tick => createTickHtml(tick)).join("");
    return `
        <div class="mb-8" data-date="${date}">
            <h2 class="text-xl font-semibold mb-3 sticky top-0 bg-[var(--color-bg)] py-2 border-b border-[var(--color-accent)]">
                ${formattedDate}
            </h2>
            <div class="space-y-3">
                ${ticksHtml}
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

            // Group ticks by date
            const ticksByDate = new Map<string, TickData[]>();
            for (const tick of data.ticks) {
                const date = tick.tickDate;
                if (!ticksByDate.has(date)) {
                    ticksByDate.set(date, []);
                }
                ticksByDate.get(date)!.push(tick);
            }

            // Append ticks to existing date groups or create new ones
            ticksByDate.forEach((ticks, date) => {
                // Check if this date group already exists
                const existingGroup = container.querySelector(`[data-date="${date}"]`);

                if (existingGroup) {
                    // Append ticks to existing date group
                    const ticksContainer = existingGroup.querySelector('.space-y-3');
                    if (ticksContainer) {
                        ticks.forEach(tick => {
                            ticksContainer.insertAdjacentHTML('beforeend', createTickHtml(tick));
                        });
                    }
                } else {
                    // Create new date group
                    const formattedDate = formatDate(date);
                    container.insertAdjacentHTML('beforeend', createDateGroupHtml(date, formattedDate, ticks));
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
