import { getSecret, STRAPI_API_URL } from 'astro:env/server'

const STRAPI_URL = STRAPI_API_URL

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL_MS = 60 * 60 * 1000;

// Isolate-level cache with TTL for Strapi API responses
// This cache persists across requests within the same Worker isolate,
// providing performance benefits while ensuring data freshness via TTL
interface CachedResponse {
    ok: boolean;
    status: number;
    data: unknown;
    expiresAt: number;
}
const responseCache = new Map<string, CachedResponse>();

// Clear the isolate-level cache (called by /api/cachebust)
export function clearResponseCache() {
    responseCache.clear();
}

// Helper to make authenticated requests to Strapi with TTL-based caching
async function strapiFetch(url: string): Promise<Response> {
    const now = Date.now();

    // Check for valid cached response
    const cached = responseCache.get(url);
    if (cached && cached.expiresAt > now) {
        console.debug(`Cache HIT (TTL: ${Math.round((cached.expiresAt - now) / 1000)}s remaining):`, url);
        return new Response(JSON.stringify(cached.data), {
            status: cached.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Cache miss or expired
    if (cached) {
        console.debug("Cache EXPIRED - fetching:", url);
        responseCache.delete(url);
    } else {
        console.debug("Cache MISS - fetching:", url);
    }

    const headers: HeadersInit = {}
    const token = getSecret('STRAPI_API_TOKEN')
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    // Only cache successful responses with data
    const hasData = data?.data !== null &&
        !(Array.isArray(data?.data) && data.data.length === 0);

    if (response.ok && hasData) {
        responseCache.set(url, {
            ok: response.ok,
            status: response.status,
            data,
            expiresAt: now + CACHE_TTL_MS,
        });
    }

    return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
}

export interface PaginatedPostsResponse {
    posts: any[];
    pagination: PaginationMeta;
}

export async function fetchPostsPaginated(page: number = 1, pageSize: number = 6): Promise<PaginatedPostsResponse> {
    try {
        const reqUrl = `${STRAPI_URL}/api/posts?populate=*&sort=publishedDate:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
        console.debug("Fetching paginated posts from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.status}`)
        }

        const data = await response.json()
        return {
            posts: data.data || [],
            pagination: data.meta?.pagination || { page: 1, pageSize, pageCount: 1, total: 0 }
        }
    } catch (error) {
        console.error("Error fetching paginated posts:", error)
        return {
            posts: [],
            pagination: { page: 1, pageSize, pageCount: 1, total: 0 }
        }
    }
}

export async function fetchPosts() {
    try {
        const reqUrl = `${STRAPI_URL}/api/posts?populate=*&sort=publishedDate:desc`
        console.debug("Fetching posts from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch posts: ${response.status}`)
        }

        const data = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Error fetching posts:", error)
        return []
    }
}

export async function fetchPostBySlug(slug: string, preview: boolean = false) {
    try {
        let reqUrl = `${STRAPI_URL}/api/posts?filters[slug][$eq]=${slug}&populate=*`
        if (preview) {
            reqUrl += "&status=draft"
        }
        console.debug("Fetching posts from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch post: ${response.status}`)
        }

        const data = await response.json()
        return data.data[0] || null
    } catch (error) {
        console.error("Error fetching post:", error)
        return null
    }
}

export async function fetchSingleType(pageName: string) {
    try {
        const reqUrl = `${STRAPI_URL}/api/${pageName}?populate=*`
        console.debug("Fetching single type from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            // 404 is expected if the single type content hasn't been created yet
            if (response.status === 404) {
                return null
            }
            throw new Error(`Failed to fetch single type: ${response.status}`)
        }

        const data = await response.json()
        return data.data || null
    } catch (error) {
        console.error("Error fetching single type:", error)
        return null
    }
}

export async function fetchSiteSettings() {
    return fetchSingleType("site-settings")
}

// Strapi image types
export interface StrapiImageFormat {
    url: string;
    width: number;
    height: number;
}

export interface StrapiImage {
    id: number;
    url: string;
    alternativeText: string | null;
    width: number;
    height: number;
    formats?: {
        thumbnail?: StrapiImageFormat;
        small?: StrapiImageFormat;
        medium?: StrapiImageFormat;
        large?: StrapiImageFormat;
        xlarge?: StrapiImageFormat;
    };
}

// Climbing tick types
export interface ClimbingRoute {
    id: number;
    documentId: string;
    name: string;
    rating: string;
    ratingCode: number;
    routeType: string;
    location: string;
    avgStars: number;
    pitches: number;
    length: number;
    mountainProjectUrl: string;
}

export interface Person {
    id: number;
    documentId: string;
    name: string;
}

export type GoalType = 'lead_pitches' | 'lead_climbs' | 'redpoints' | 'onsights' | 'grade_target';

export interface ClimbingGoal {
    id: number;
    documentId: string;
    title: string;
    year: number;
    goalType: GoalType;
    targetCount: number;
    minGrade?: string;
    routeType?: string;
    isActive: boolean;
    person?: Person;
}

export interface ClimbingTick {
    id: number;
    documentId: string;
    tickDate: string;
    style: string;
    leadStyle: string;
    yourStars: number;
    yourRating: string;
    mpNotes: string;
    notes: string;
    photos: StrapiImage[];
    route: ClimbingRoute;
    person: Person;
}

export interface PaginatedClimbingTicksResponse {
    ticks: ClimbingTick[];
    pagination: PaginationMeta;
}

export async function fetchClimbingTicksPaginated(page: number = 1, pageSize: number = 50): Promise<PaginatedClimbingTicksResponse> {
    try {
        const reqUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
        console.debug("Fetching paginated climbing ticks from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch climbing ticks: ${response.status}`)
        }

        const data = await response.json()
        return {
            ticks: data.data || [],
            pagination: data.meta?.pagination || { page: 1, pageSize, pageCount: 1, total: 0 }
        }
    } catch (error) {
        console.error("Error fetching paginated climbing ticks:", error)
        return {
            ticks: [],
            pagination: { page: 1, pageSize, pageCount: 1, total: 0 }
        }
    }
}

export async function fetchClimbingTicksByDateRange(startDate: string, endDate: string): Promise<ClimbingTick[]> {
    try {
        const reqUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:asc&filters[tickDate][$gte]=${startDate}&filters[tickDate][$lte]=${endDate}`
        console.debug("Fetching climbing ticks by date range from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch climbing ticks: ${response.status}`)
        }

        const data = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Error fetching climbing ticks by date range:", error)
        return []
    }
}

export async function fetchAllPeople(): Promise<Person[]> {
    try {
        const reqUrl = `${STRAPI_URL}/api/people?sort=name:asc`
        console.debug("Fetching all people from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch people: ${response.status}`)
        }

        const data = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Error fetching people:", error)
        return []
    }
}

export async function fetchClimbingGoals(personDocumentId?: string, year?: number): Promise<ClimbingGoal[]> {
    try {
        let reqUrl = `${STRAPI_URL}/api/climbing-goals?populate=*&filters[isActive][$eq]=true`
        if (personDocumentId) {
            reqUrl += `&filters[person][documentId][$eq]=${personDocumentId}`
        }
        if (year) {
            reqUrl += `&filters[year][$eq]=${year}`
        }
        console.debug("Fetching climbing goals from:", reqUrl)
        const response = await strapiFetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch climbing goals: ${response.status}`)
        }

        const data = await response.json()
        return data.data || []
    } catch (error) {
        console.error("Error fetching climbing goals:", error)
        return []
    }
}

// Helper to fetch all pages of climbing ticks
async function fetchAllTicksWithPagination(baseUrl: string): Promise<ClimbingTick[]> {
    const allTicks: ClimbingTick[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
        const reqUrl = `${baseUrl}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
        console.debug(`Fetching climbing ticks page ${page} from:`, reqUrl);
        const response = await strapiFetch(reqUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch climbing ticks: ${response.status}`);
        }

        const data = await response.json();
        const ticks = data.data || [];
        allTicks.push(...ticks);

        const pagination = data.meta?.pagination;
        hasMore = pagination && page < pagination.pageCount;
        page++;
    }

    return allTicks;
}

export async function fetchAllClimbingTicks(year?: number): Promise<ClimbingTick[]> {
    try {
        let baseUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:desc`
        if (year) {
            baseUrl += `&filters[tickDate][$gte]=${year}-01-01&filters[tickDate][$lte]=${year}-12-31`
        }
        return await fetchAllTicksWithPagination(baseUrl);
    } catch (error) {
        console.error("Error fetching all climbing ticks:", error)
        return []
    }
}

export async function fetchClimbingTicksForPerson(personDocumentId: string, year?: number): Promise<ClimbingTick[]> {
    try {
        let baseUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:desc&filters[person][documentId][$eq]=${personDocumentId}`
        if (year) {
            baseUrl += `&filters[tickDate][$gte]=${year}-01-01&filters[tickDate][$lte]=${year}-12-31`
        }
        return await fetchAllTicksWithPagination(baseUrl);
    } catch (error) {
        console.error("Error fetching climbing ticks for person:", error)
        return []
    }
}

export async function fetchClimbingTicksLast12Months(): Promise<ClimbingTick[]> {
    try {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        const baseUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:desc&filters[tickDate][$gte]=${startDate}&filters[tickDate][$lte]=${endDate}`
        return await fetchAllTicksWithPagination(baseUrl);
    } catch (error) {
        console.error("Error fetching climbing ticks for last 12 months:", error)
        return []
    }
}

export async function fetchClimbingTicksLast12MonthsForPerson(personDocumentId: string): Promise<ClimbingTick[]> {
    try {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        const startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
        const baseUrl = `${STRAPI_URL}/api/climbing-ticks?populate=*&sort=tickDate:desc&filters[person][documentId][$eq]=${personDocumentId}&filters[tickDate][$gte]=${startDate}&filters[tickDate][$lte]=${endDate}`
        return await fetchAllTicksWithPagination(baseUrl);
    } catch (error) {
        console.error("Error fetching climbing ticks for last 12 months for person:", error)
        return []
    }
}
