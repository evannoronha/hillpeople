/**
 * "Fill missing SEO" button on the posts list. Generates SEO for published
 * posts that have no meta description or excerpt, one post at a time.
 */
import { useState } from 'react';
import { Box, Button, Flex, Modal, Typography } from '@strapi/design-system';
import { Sparkle } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { useParams } from 'react-router-dom';

const POST_UID = 'api::post.post';

interface MissingPost {
  documentId: string;
  title: string;
  slug: string;
  hasUnpublishedEdits: boolean;
}

type RowStatus =
  | { state: 'pending' }
  | { state: 'working' }
  | { state: 'updated'; excerpt: string }
  | { state: 'skipped'; reason: string }
  | { state: 'failed'; reason: string };

const statusText = (status: RowStatus) => {
  switch (status.state) {
    case 'pending':
      return '';
    case 'working':
      return 'Generating…';
    case 'updated':
      return `Updated: “${status.excerpt}”`;
    case 'skipped':
      return `Skipped: ${status.reason}`;
    case 'failed':
      return `Failed: ${status.reason}`;
  }
};

const statusColor = (status: RowStatus) =>
  status.state === 'updated' ? 'success600' : status.state === 'failed' ? 'danger600' : 'neutral600';

export const BackfillSeoButton = () => {
  const { slug } = useParams<{ slug: string }>();
  const { get, post } = useFetchClient();
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<MissingPost[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (slug !== POST_UID) return null;

  const load = async () => {
    setPosts(null);
    setStatuses({});
    setLoadError(null);
    try {
      const { data } = await get<MissingPost[]>('/seo-assistant/missing');
      setPosts(data);
      setStatuses(
        Object.fromEntries(
          data.map((p) => [
            p.documentId,
            p.hasUnpublishedEdits
              ? { state: 'skipped', reason: 'has unpublished edits, use Generate SEO in the editor' }
              : { state: 'pending' },
          ])
        )
      );
    } catch (error: any) {
      setLoadError(error?.response?.data?.error?.message ?? 'Could not load posts');
    }
  };

  const run = async () => {
    if (!posts) return;
    setIsRunning(true);
    for (const p of posts) {
      if (statuses[p.documentId]?.state !== 'pending') continue;
      setStatuses((s) => ({ ...s, [p.documentId]: { state: 'working' } }));
      let next: RowStatus;
      try {
        const { data } = await post<{ status: string; reason?: string; seo?: { excerpt: string } }>(
          `/seo-assistant/backfill/${p.documentId}`
        );
        next =
          data.status === 'updated'
            ? { state: 'updated', excerpt: data.seo?.excerpt ?? '' }
            : { state: 'skipped', reason: data.reason ?? 'skipped' };
      } catch (error: any) {
        next = { state: 'failed', reason: error?.response?.data?.error?.message ?? 'request failed' };
      }
      setStatuses((s) => ({ ...s, [p.documentId]: next }));
    }
    setIsRunning(false);
  };

  const pendingCount = Object.values(statuses).filter((s) => s.state === 'pending').length;

  return (
    <Modal.Root
      open={open}
      onOpenChange={(next: boolean) => {
        if (isRunning) return;
        setOpen(next);
        if (next) load();
      }}
    >
      <Modal.Trigger>
        <Button variant="secondary" startIcon={<Sparkle />}>
          Fill missing SEO
        </Button>
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Fill missing SEO</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadError && <Typography textColor="danger600">{loadError}</Typography>}
          {!loadError && !posts && <Typography>Loading posts…</Typography>}
          {posts && posts.length === 0 && (
            <Typography>Every published post already has a meta description and excerpt.</Typography>
          )}
          {posts && posts.length > 0 && (
            <Flex direction="column" alignItems="stretch" gap={3}>
              <Typography textColor="neutral600">
                These published posts are missing a meta description or excerpt. Generating fills
                only the empty fields, then republishes the post. Review the results afterwards.
              </Typography>
              {posts.map((p) => (
                <Box key={p.documentId}>
                  <Typography fontWeight="bold">{p.title}</Typography>
                  <Box>
                    <Typography variant="pi" textColor={statusColor(statuses[p.documentId])}>
                      {statusText(statuses[p.documentId])}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Flex>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary" disabled={isRunning}>
              Close
            </Button>
          </Modal.Close>
          <Button onClick={run} loading={isRunning} disabled={!pendingCount}>
            Generate for {pendingCount} post{pendingCount === 1 ? '' : 's'}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};
