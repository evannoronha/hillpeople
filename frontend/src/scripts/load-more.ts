// Load more posts handler

interface PostData {
    title: string;
    slug: string;
    publishedDate: string;
    imageUrl: string | null;
}

interface ApiResponse {
    posts: PostData[];
    pagination: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
    };
}

function createPostCard(post: PostData): string {
    const formattedDate = new Date(post.publishedDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const imageHtml = post.imageUrl
        ? `<div class="aspect-square overflow-hidden rounded-t-lg">
            <img src="${post.imageUrl}" alt="${post.title}" class="w-full h-full object-cover" loading="lazy" />
           </div>`
        : '';

    return `
        <a href="/blog/${post.slug}" class="block hover:opacity-90 transition rounded-lg shadow-md bg-inverse">
            ${imageHtml}
            <div class="p-4">
                <h3 class="text-xl font-semibold leading-tight">${post.title}</h3>
                <p class="text-sm mt-1">${formattedDate}</p>
            </div>
        </a>
    `;
}

export function initLoadMore() {
    const button = document.getElementById('load-more') as HTMLButtonElement | null;
    const grid = document.getElementById('posts-grid');

    if (!button || !grid) return;

    const pageSize = parseInt(button.dataset.pageSize || '6', 10);
    let currentPage = parseInt(button.dataset.page || '2', 10);
    let isLoading = false;

    button.addEventListener('click', async () => {
        if (isLoading) return;

        isLoading = true;
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;

        try {
            const response = await fetch(`/api/posts?page=${currentPage}&pageSize=${pageSize}`);
            const data: ApiResponse = await response.json();

            // Append new posts to grid
            data.posts.forEach(post => {
                const postHtml = createPostCard(post);
                grid.insertAdjacentHTML('beforeend', postHtml);
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
            console.error('Failed to load more posts:', error);
            button.textContent = 'Failed to load. Try again.';
            button.disabled = false;
        } finally {
            isLoading = false;
        }
    });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoadMore);
} else {
    initLoadMore();
}
