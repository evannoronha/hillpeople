import { getSecret, STRAPI_API_URL } from 'astro:env/server'

const STRAPI_URL = STRAPI_API_URL

// Helper to make authenticated requests to Strapi
async function strapiFetch(url: string): Promise<Response> {
    const headers: HeadersInit = {}
    const token = getSecret('STRAPI_API_TOKEN')
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return fetch(url, { headers })
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
