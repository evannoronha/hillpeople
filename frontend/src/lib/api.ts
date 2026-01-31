const STRAPI_URL = import.meta.env.STRAPI_API_URL

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
        const response = await fetch(reqUrl)

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
        const response = await fetch(reqUrl)

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
        const response = await fetch(reqUrl)

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
        const response = await fetch(reqUrl)

        if (!response.ok) {
            throw new Error(`Failed to fetch single type: ${response.status}`)
        }

        const data = await response.json()
        return data.data || null
    } catch (error) {
        console.error("Error fetching single type:", error)
        return null
    }
}
