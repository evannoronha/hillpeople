const STRAPI_URL = import.meta.env.STRAPI_API_URL || "https://your-strapi-cloud-url.com"
const STRAPI_TOKEN = import.meta.env.STRAPI_API_TOKEN

const headers = {
    "Content-Type": "application/json",
    ...(STRAPI_TOKEN && { Authorization: `Bearer ${STRAPI_TOKEN}` }),
}

export async function fetchPosts() {
    try {
        const reqUrl = `${STRAPI_URL}/api/posts?populate=*`
        console.debug("Fetching posts from:", reqUrl)
        const response = await fetch(reqUrl, { headers })

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

export async function fetchPostBySlug(slug: string) {
    try {
        const response = await fetch(`${STRAPI_URL}/api/posts?filters[slug][$eq]=${slug}&populate=cover`, { headers })

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
