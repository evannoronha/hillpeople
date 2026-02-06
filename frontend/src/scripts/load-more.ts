// Load more posts handler

interface PostImage {
  url: string;
  srcset: string | null;
  width: number;
  height: number;
  alt: string;
  focalPoint?: { x: number; y: number };
}

interface PostData {
  title: string;
  slug: string;
  publishedDate: string;
  excerpt: string | null;
  readingTime: number | null;
  image: PostImage | null;
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function createPostCard(post: PostData): string {
  const formattedDate = new Date(post.publishedDate).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const isoDate = new Date(post.publishedDate).toISOString();
  const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  const objectPositionStyle = post.image?.focalPoint
    ? ` style="object-position: ${post.image.focalPoint.x}% ${post.image.focalPoint.y}%"`
    : '';

  const imageHtml = post.image
    ? `<div class="aspect-square overflow-hidden rounded-t-lg">
        <img
          src="${post.image.url}"
          ${post.image.srcset ? `srcset="${post.image.srcset}"` : ''}
          sizes="${sizes}"
          width="${post.image.width}"
          height="${post.image.height}"
          alt="${escapeHtml(post.image.alt)}"
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"${objectPositionStyle}
        />
      </div>`
    : '';

  const excerptHtml = post.excerpt
    ? `<p class="text-sm mt-2 line-clamp-2 opacity-80">${escapeHtml(post.excerpt)}</p>`
    : '';

  const readingTimeHtml = post.readingTime
    ? `<span aria-hidden="true">&middot;</span>
       <span>${post.readingTime} min read</span>`
    : '';

  return `
    <a href="/blog/${post.slug}" class="group block rounded-lg shadow-md bg-inverse hover:shadow-lg transition-shadow">
      ${imageHtml}
      <div class="p-4">
        <h3 class="text-xl font-semibold leading-tight group-hover:underline">${escapeHtml(post.title)}</h3>
        ${excerptHtml}
        <div class="flex items-center gap-3 text-sm mt-3 opacity-70">
          <time datetime="${isoDate}">${formattedDate}</time>
          ${readingTimeHtml}
        </div>
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
      const response = await fetch(
        `/api/posts?page=${currentPage}&pageSize=${pageSize}`
      );
      const data: ApiResponse = await response.json();

      // Append new posts to grid
      data.posts.forEach((post) => {
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
