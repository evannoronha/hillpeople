export interface TickDetail {
    climber?: string;
    style?: string;
    leadStyle?: string;
    pitches: number;
    notes?: string;
}

export interface GroupedRoute {
    route: {
        documentId?: string;
        name: string;
        rating: string;
        routeType?: string;
        location?: string;
        mountainProjectUrl?: string;
    } | null;
    ticks: TickDetail[];
    bestStars: number;
    photos?: Array<{
        id: number;
        url: string;
        formats?: {
            small?: { url: string };
            medium?: { url: string };
            large?: { url: string };
            thumbnail?: { url: string };
        };
    }>;
}

export interface TicksByDate {
    date: string;
    formattedDate: string;
    routes: GroupedRoute[];
}

// 'all' = any style, 'lead' = leads only, 'lead_sends' = leads excluding fell/hung
export type StyleFilter = 'all' | 'lead' | 'lead_sends';

export interface TicklistFilters {
    routeType: string | null;
    gradeMin: string | null;
    gradeMax: string | null;
    minStars: number;
    search: string;
    styleFilter: StyleFilter;
}

export const DEFAULT_FILTERS: TicklistFilters = {
    routeType: null,
    gradeMin: null,
    gradeMax: null,
    minStars: 0,
    search: '',
    styleFilter: 'all',
};
