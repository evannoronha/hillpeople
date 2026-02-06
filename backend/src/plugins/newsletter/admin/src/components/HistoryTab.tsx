import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Flex,
  Loader,
  Alert,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface SendRecord {
  id: number;
  documentId: string;
  sentAt: string;
  trigger: 'cron' | 'manual' | 'test';
  postSlugs: Array<{ title: string; slug: string }>;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  errorDetails: any;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: 'success100', text: 'success700' },
  failed: { bg: 'danger100', text: 'danger700' },
  sending: { bg: 'warning100', text: 'warning700' },
  pending: { bg: 'neutral150', text: 'neutral600' },
};

const TRIGGER_COLORS: Record<string, { bg: string; text: string }> = {
  cron: { bg: 'neutral150', text: 'neutral600' },
  manual: { bg: 'primary100', text: 'primary700' },
  test: { bg: 'warning100', text: 'warning700' },
};

const HistoryTab = () => {
  const [sends, setSends] = useState<SendRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 15;

  const { get } = useFetchClient();

  const fetchHistory = async (p: number) => {
    try {
      setLoading(true);
      const { data } = await get(`/newsletter/history?page=${p}&pageSize=${pageSize}`);
      setSends(data.results || []);
      setTotal(data.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && sends.length === 0) {
    return (
      <Flex justifyContent="center" padding={6}>
        <Loader />
      </Flex>
    );
  }

  if (error) {
    return (
      <Alert closeLabel="Close" onClose={() => setError(null)} variant="danger" title="Error">
        {error}
      </Alert>
    );
  }

  if (sends.length === 0) {
    return (
      <Box padding={6}>
        <Typography textColor="neutral600">
          No newsletters have been sent yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Table>
        <Thead>
          <Tr>
            <Th><Typography variant="sigma">Date</Typography></Th>
            <Th><Typography variant="sigma">Trigger</Typography></Th>
            <Th><Typography variant="sigma">Posts</Typography></Th>
            <Th><Typography variant="sigma">Sent</Typography></Th>
            <Th><Typography variant="sigma">Status</Typography></Th>
          </Tr>
        </Thead>
        <Tbody>
          {sends.map((send) => {
            const statusColor = STATUS_COLORS[send.status] || STATUS_COLORS.pending;
            const triggerColor = TRIGGER_COLORS[send.trigger] || TRIGGER_COLORS.cron;
            const postCount = Array.isArray(send.postSlugs) ? send.postSlugs.length : 0;
            const postLabel = postCount === 0
              ? '—'
              : postCount === 1
                ? (send.postSlugs[0].title || send.postSlugs[0].slug)
                : `${send.postSlugs[0].title || send.postSlugs[0].slug} +${postCount - 1} more`;

            return (
              <Tr key={send.documentId}>
                <Td>
                  <Typography textColor="neutral600" variant="omega">
                    {formatDate(send.sentAt)}
                  </Typography>
                </Td>
                <Td>
                  <Badge backgroundColor={triggerColor.bg} textColor={triggerColor.text}>
                    {send.trigger}
                  </Badge>
                </Td>
                <Td>
                  <Typography style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {postLabel}
                  </Typography>
                </Td>
                <Td>
                  <Typography>
                    {send.successCount}/{send.recipientCount}
                    {send.failureCount > 0 && (
                      <Typography tag="span" textColor="danger600"> ({send.failureCount} failed)</Typography>
                    )}
                  </Typography>
                </Td>
                <Td>
                  <Badge backgroundColor={statusColor.bg} textColor={statusColor.text}>
                    {send.status}
                  </Badge>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      {totalPages > 1 && (
        <Flex justifyContent="center" padding={4} gap={2}>
          <Button
            variant="tertiary"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <Typography textColor="neutral600">
            Page {page} of {totalPages}
          </Typography>
          <Button
            variant="tertiary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  );
};

export { HistoryTab };
