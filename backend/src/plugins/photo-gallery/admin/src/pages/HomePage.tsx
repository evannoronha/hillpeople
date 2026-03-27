import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Main,
  Box,
  Typography,
  Button,
  Flex,
  Alert,
  Loader,
  TextInput,
  Field,
  SingleSelect,
  SingleSelectOption,
  Grid,
  Badge,
} from '@strapi/design-system';
import { Upload, Trash, Plus } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';

interface Album {
  documentId: string;
  title: string;
  slug: string;
  date: string;
}

interface UploadedPhoto {
  r2Path: string;
  width: number;
  height: number;
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: string;
  originalName: string;
  // Client-side fields for editing before save
  caption?: string;
  altText?: string;
  sortOrder?: number;
}

const HomePage = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumSlug, setSelectedAlbumSlug] = useState<string>('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDate, setNewAlbumDate] = useState('');
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { get, post, del } = useFetchClient();

  const fetchAlbums = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await get('/photo-gallery/albums');
      setAlbums(data.albums || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const getAlbumSlug = (): string | null => {
    if (showNewAlbum) {
      if (!newAlbumTitle) {
        setError('Please enter an album title');
        return null;
      }
      // Generate slug from title
      return newAlbumTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    if (!selectedAlbumSlug) {
      setError('Please select an album');
      return null;
    }
    return selectedAlbumSlug;
  };

  const collectFilesFromDrop = async (
    dataTransfer: DataTransfer,
  ): Promise<File[]> => {
    const files: File[] = [];

    // Use DataTransferItemList + webkitGetAsEntry to handle folders
    if (dataTransfer.items && dataTransfer.items.length > 0) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        const entry = item.webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      const readEntry = (entry: FileSystemEntry): Promise<File[]> => {
        return new Promise((resolve) => {
          if (entry.isFile) {
            (entry as FileSystemFileEntry).file(
              (f) => {
                if (f.type.startsWith('image/')) resolve([f]);
                else resolve([]);
              },
              () => resolve([]),
            );
          } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            const allEntries: FileSystemEntry[] = [];
            const readBatch = () => {
              reader.readEntries(async (batch) => {
                if (batch.length === 0) {
                  const nested = await Promise.all(allEntries.map(readEntry));
                  resolve(nested.flat());
                } else {
                  allEntries.push(...batch);
                  readBatch();
                }
              });
            };
            readBatch();
          } else {
            resolve([]);
          }
        });
      };

      const nested = await Promise.all(entries.map(readEntry));
      files.push(...nested.flat());
    }

    // Fallback if webkitGetAsEntry didn't find anything
    if (files.length === 0 && dataTransfer.files?.length) {
      files.push(
        ...Array.from(dataTransfer.files).filter(
          (f) => f.size > 0 && f.type.startsWith('image/'),
        ),
      );
    }

    return files;
  };

  const handleUploadFiles = async (files: File[]) => {
    const albumSlug = getAlbumSlug();
    if (!albumSlug) return;

    try {
      setUploading(true);
      setError(null);

      // Upload files in batches of 5 to avoid overwhelming the server
      const batchSize = 5;
      const allNewPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const formData = new FormData();
        formData.append('albumSlug', albumSlug);
        batch.forEach((file) => {
          formData.append('files', file);
        });

        const { data } = await post('/photo-gallery/upload', formData);

        const newPhotos: UploadedPhoto[] = (data.photos || []).map(
          (p: UploadedPhoto, idx: number) => ({
            ...p,
            caption: '',
            altText: '',
            sortOrder: uploadedPhotos.length + allNewPhotos.length + idx,
          }),
        );
        allNewPhotos.push(...newPhotos);
      }

      setUploadedPhotos((prev) => [...prev, ...allNewPhotos]);
      setSuccess(
        `Uploaded ${allNewPhotos.length} photo${allNewPhotos.length !== 1 ? 's' : ''}`,
      );
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Upload failed',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = await collectFilesFromDrop(e.dataTransfer);
    if (files.length > 0) {
      handleUploadFiles(files);
    } else {
      setError(
        'No image files found. Make sure you are dropping image files (JPEG, PNG, WebP).',
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleUploadFiles(Array.from(e.target.files));
    }
  };

  const removePhoto = async (index: number) => {
    const photo = uploadedPhotos[index];
    try {
      await del('/photo-gallery/delete', { data: { key: photo.r2Path } });
      setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      setError(err.message || 'Failed to delete photo');
    }
  };

  const updatePhoto = (index: number, field: string, value: string) => {
    setUploadedPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const handleSave = async () => {
    const albumSlug = getAlbumSlug();
    if (!albumSlug) return;
    if (uploadedPhotos.length === 0) {
      setError('No photos to save');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Check if album already exists
      const existingAlbum = albums.find((a) => a.slug === albumSlug);

      const photosData = uploadedPhotos.map((p, i) => ({
        r2Path: p.r2Path,
        width: p.width,
        height: p.height,
        caption: p.caption || null,
        altText: p.altText || null,
        sortOrder: i,
        cameraMake: p.cameraMake || null,
        cameraModel: p.cameraModel || null,
        lens: p.lens || null,
        focalLength: p.focalLength || null,
        aperture: p.aperture || null,
        shutterSpeed: p.shutterSpeed || null,
        iso: p.iso || null,
      }));

      if (existingAlbum) {
        // Fetch current album to get existing photos, then append
        const { data: albumData } = await get(
          `/content-manager/collection-types/api::photo-album.photo-album/${existingAlbum.documentId}`,
        );
        const existingPhotos = albumData?.photos || [];
        const allPhotos = [...existingPhotos, ...photosData];

        await post(
          `/content-manager/collection-types/api::photo-album.photo-album/${existingAlbum.documentId}`,
          { photos: allPhotos },
        );
      } else {
        // Create new album
        await post(
          '/content-manager/collection-types/api::photo-album.photo-album',
          {
            title: newAlbumTitle,
            slug: albumSlug,
            date: newAlbumDate || new Date().toISOString().split('T')[0],
            photos: photosData,
            coverImagePath: photosData[0]?.r2Path || null,
            coverImageWidth: photosData[0]?.width || null,
            coverImageHeight: photosData[0]?.height || null,
          },
        );
      }

      setSuccess(
        `Saved ${uploadedPhotos.length} photos to album "${existingAlbum?.title || newAlbumTitle}"`,
      );
      setUploadedPhotos([]);
      setShowNewAlbum(false);
      setNewAlbumTitle('');
      setNewAlbumDate('');
      await fetchAlbums();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Save failed',
      );
    } finally {
      setSaving(false);
    }
  };

  const formatExif = (photo: UploadedPhoto): string => {
    const parts = [
      photo.cameraMake && photo.cameraModel
        ? `${photo.cameraMake} ${photo.cameraModel}`
        : photo.cameraModel || photo.cameraMake,
      photo.lens,
      photo.focalLength,
      photo.aperture,
      photo.shutterSpeed ? `${photo.shutterSpeed}s` : null,
      photo.iso ? `ISO ${photo.iso}` : null,
    ].filter(Boolean);
    return parts.join(' \u00b7 ');
  };

  if (loading) {
    return (
      <Main>
        <Box padding={8} background="neutral100">
          <Flex justifyContent="center" padding={6}>
            <Loader />
          </Flex>
        </Box>
      </Main>
    );
  }

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Box paddingBottom={6}>
          <Typography variant="alpha" as="h1">
            Photo Gallery
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            Upload photos to Cloudflare R2 and manage gallery albums
          </Typography>
        </Box>

        {error && (
          <Box paddingBottom={4}>
            <Alert
              closeLabel="Close"
              onClose={() => setError(null)}
              variant="danger"
              title="Error"
            >
              {error}
            </Alert>
          </Box>
        )}

        {success && (
          <Box paddingBottom={4}>
            <Alert
              closeLabel="Close"
              onClose={() => setSuccess(null)}
              variant="success"
              title="Success"
            >
              {success}
            </Alert>
          </Box>
        )}

        {/* Album selection */}
        <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius marginBottom={4}>
          <Typography variant="delta" as="h2" paddingBottom={4}>
            Album
          </Typography>

          {!showNewAlbum ? (
            <Flex gap={2} alignItems="flex-end">
              <Box style={{ flex: 1 }}>
                <Field.Root name="album">
                  <Field.Label>Select album</Field.Label>
                  <SingleSelect
                    placeholder="Choose an album..."
                    value={selectedAlbumSlug}
                    onChange={(v: string) => setSelectedAlbumSlug(v)}
                  >
                    {albums.map((a) => (
                      <SingleSelectOption key={a.documentId} value={a.slug}>
                        {a.title} ({a.date})
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
              </Box>
              <Button
                variant="secondary"
                startIcon={<Plus />}
                onClick={() => setShowNewAlbum(true)}
              >
                New Album
              </Button>
            </Flex>
          ) : (
            <Flex gap={2} alignItems="flex-end">
              <Box style={{ flex: 1 }}>
                <Field.Root name="albumTitle">
                  <Field.Label>Album title</Field.Label>
                  <TextInput
                    placeholder="e.g., Yosemite Valley 2025"
                    value={newAlbumTitle}
                    onChange={(e: any) => setNewAlbumTitle(e.target.value)}
                  />
                </Field.Root>
              </Box>
              <Box>
                <Field.Root name="albumDate">
                  <Field.Label>Date</Field.Label>
                  <TextInput
                    type="date"
                    value={newAlbumDate}
                    onChange={(e: any) => setNewAlbumDate(e.target.value)}
                  />
                </Field.Root>
              </Box>
              <Button
                variant="tertiary"
                onClick={() => {
                  setShowNewAlbum(false);
                  setNewAlbumTitle('');
                  setNewAlbumDate('');
                }}
              >
                Cancel
              </Button>
            </Flex>
          )}
        </Box>

        {/* Upload dropzone */}
        <Box
          background={dragActive ? 'primary100' : 'neutral0'}
          padding={6}
          shadow="filterShadow"
          hasRadius
          marginBottom={4}
          style={{
            border: `2px dashed ${dragActive ? '#4945ff' : '#dcdce4'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onDragOver={(e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            padding={6}
          >
            {uploading ? (
              <>
                <Loader />
                <Typography>Uploading and extracting EXIF data...</Typography>
              </>
            ) : (
              <>
                <Upload />
                <Typography variant="delta">
                  Drag and drop photos here
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  or click to browse files (JPEG, PNG, WebP)
                </Typography>
              </>
            )}
          </Flex>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Box>

        {/* Uploaded photos preview */}
        {uploadedPhotos.length > 0 && (
          <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius marginBottom={4}>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
              <Typography variant="delta" as="h2">
                Uploaded Photos ({uploadedPhotos.length})
              </Typography>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={saving}
                size="L"
              >
                Save to Album
              </Button>
            </Flex>

            <Flex direction="column" gap={4}>
              {uploadedPhotos.map((photo, index) => (
                <Box
                  key={photo.r2Path}
                  background="neutral100"
                  padding={4}
                  hasRadius
                >
                  <Flex gap={4} alignItems="flex-start">
                    {/* Thumbnail */}
                    <Box
                      style={{
                        width: 120,
                        height: 90,
                        borderRadius: 4,
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#f0f0f0',
                      }}
                    >
                      <img
                        src={`https://photos.hillpeople.net/cdn-cgi/image/width=240,quality=70,format=auto/${photo.r2Path}`}
                        alt={photo.originalName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>

                    {/* Metadata and editing fields */}
                    <Box style={{ flex: 1 }}>
                      <Flex justifyContent="space-between" alignItems="flex-start" paddingBottom={2}>
                        <Box>
                          <Typography fontWeight="bold">
                            {photo.originalName}
                          </Typography>
                          {photo.width > 0 && (
                            <Typography variant="pi" textColor="neutral600">
                              {photo.width} &times; {photo.height}
                            </Typography>
                          )}
                          {formatExif(photo) && (
                            <Box paddingTop={1}>
                              <Badge>{formatExif(photo)}</Badge>
                            </Box>
                          )}
                        </Box>
                        <Button
                          variant="danger-light"
                          size="S"
                          startIcon={<Trash />}
                          onClick={() => removePhoto(index)}
                        >
                          Remove
                        </Button>
                      </Flex>

                      <Grid.Root gap={2} gridCols={2}>
                        <Grid.Item col={1}>
                          <Field.Root name={`caption-${index}`}>
                            <Field.Label>Caption</Field.Label>
                            <TextInput
                              placeholder="Optional caption..."
                              value={photo.caption || ''}
                              onChange={(e: any) =>
                                updatePhoto(index, 'caption', e.target.value)
                              }
                            />
                          </Field.Root>
                        </Grid.Item>
                        <Grid.Item col={1}>
                          <Field.Root name={`alt-${index}`}>
                            <Field.Label>Alt text</Field.Label>
                            <TextInput
                              placeholder="Image description..."
                              value={photo.altText || ''}
                              onChange={(e: any) =>
                                updatePhoto(index, 'altText', e.target.value)
                              }
                            />
                          </Field.Root>
                        </Grid.Item>
                      </Grid.Root>
                    </Box>
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Box>
    </Main>
  );
};

export { HomePage };
