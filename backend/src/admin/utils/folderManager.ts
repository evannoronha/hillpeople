/**
 * Utility for managing upload folders via Strapi Admin API
 */

interface Folder {
  id: number;
  name: string;
  pathId: number;
  parent: { id: number } | null;
  path: string;
}

interface FolderCache {
  folders: Map<string, Folder>;
  lastFetch: number;
}

// Cache folders to avoid repeated API calls
let folderCache: FolderCache = {
  folders: new Map(),
  lastFetch: 0,
};

const CACHE_TTL = 30000; // 30 seconds

/**
 * Gets a cookie value by name
 */
function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Gets the auth token from Strapi's storage (matching the CKEditor plugin's approach)
 */
function getAuthToken(): string | null {
  try {
    // Match the exact approach used by @_sh/strapi-plugin-ckeditor
    const tokenFromStorage =
      localStorage.getItem('jwtToken') ?? sessionStorage.getItem('jwtToken');
    if (tokenFromStorage) {
      return JSON.parse(tokenFromStorage);
    }
    // Fallback to cookie (Strapi v5 may use cookies)
    const tokenFromCookie = getCookieValue('jwtToken');
    if (tokenFromCookie) {
      // Cookie value might be URL-encoded or have extra quotes
      let decoded = decodeURIComponent(tokenFromCookie);
      // Remove surrounding quotes if present
      if (decoded.startsWith('"') && decoded.endsWith('"')) {
        decoded = decoded.slice(1, -1);
      }
      return decoded;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Fetches all folders from Strapi and updates the cache
 */
async function fetchFolders(): Promise<Folder[]> {
  const now = Date.now();
  if (folderCache.folders.size > 0 && now - folderCache.lastFetch < CACHE_TTL) {
    return Array.from(folderCache.folders.values());
  }

  const token = getAuthToken();
  if (!token) {
    throw new Error('No auth token available');
  }

  const response = await fetch('/upload/folders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch folders: ${response.status}`);
  }

  const data = await response.json() as { data: Folder[] };
  const folders = new Map<string, Folder>();

  // Index folders by their id for easy lookup
  for (const folder of data.data) {
    folders.set(String(folder.id), folder);
  }

  folderCache = {
    folders,
    lastFetch: now,
  };

  return data.data;
}

/**
 * Finds a folder by name and optional parent ID
 */
function findFolder(folders: Folder[], name: string, parentId: number | null): Folder | undefined {
  return folders.find((f) => {
    if (f.name !== name) return false;
    if (parentId === null) {
      // Root folder: path should be just "/{pathId}" (no slash after the first segment)
      return !f.path.includes('/', 1);
    }
    // Child folder: parent's pathId should be in the path
    const parentFolder = folders.find((p) => p.id === parentId);
    if (!parentFolder) return false;
    return f.path.startsWith(parentFolder.path + '/');
  });
}

/**
 * Creates a folder in Strapi
 */
async function createFolder(name: string, parentId: number | null): Promise<Folder> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No auth token available');
  }

  const body: { name: string; parent?: number } = { name };
  if (parentId !== null) {
    body.parent = parentId;
  }

  const response = await fetch('/upload/folders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder "${name}": ${response.status}`);
  }

  const data = await response.json() as { data: Folder };

  // Invalidate cache so next fetch gets the new folder
  folderCache.lastFetch = 0;

  return data.data;
}

/**
 * Ensures a folder path exists, creating folders as needed.
 * Returns the ID of the deepest folder.
 *
 * @param pathParts Array of folder names, e.g., ["post", "dublin"]
 * @returns The folder ID to use for uploads
 */
export async function ensureFolderPath(pathParts: string[]): Promise<number> {
  if (pathParts.length === 0) {
    throw new Error('Folder path cannot be empty');
  }

  let folders = await fetchFolders();
  let parentId: number | null = null;

  for (const part of pathParts) {
    const existingFolder = findFolder(folders, part, parentId);
    if (existingFolder) {
      parentId = existingFolder.id;
    } else {
      // Create the folder
      try {
        const newFolder = await createFolder(part, parentId);
        parentId = newFolder.id;
        // Refresh folders list to include the new folder
        folders = await fetchFolders();
      } catch (error) {
        // If folder creation fails due to conflict (already exists),
        // try fetching folders again to get the ID
        folderCache.lastFetch = 0; // Force refresh
        folders = await fetchFolders();
        const folder = findFolder(folders, part, parentId);
        if (folder) {
          parentId = folder.id;
        } else {
          throw error;
        }
      }
    }
  }

  if (parentId === null) {
    throw new Error('Failed to resolve folder path');
  }

  return parentId;
}

/**
 * Clears the folder cache. Call this if folders are modified externally.
 */
export function clearFolderCache(): void {
  folderCache = {
    folders: new Map(),
    lastFetch: 0,
  };
}
