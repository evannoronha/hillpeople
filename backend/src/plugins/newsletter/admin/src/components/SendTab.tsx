import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Flex,
  Alert,
  Loader,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TextInput,
  Badge,
  Dialog,
  Field,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';

interface Post {
  documentId: string;
  title: string;
  slug: string;
  publishedDate: string;
  updatedAt: string;
}

interface Stats {
  subscriberCount: number;
  lastSend: any;
}

const SendTab = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { get, post } = useFetchClient();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postsRes, statsRes] = await Promise.all([
        get('/newsletter/eligible-posts'),
        get('/newsletter/stats'),
      ]);
      setPosts(postsRes.data.results || []);
      setStats(statsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      setShowConfirm(false);

      await post('/newsletter/send', {});

      setSuccess(`Newsletter sent to ${stats?.subscriberCount || 0} subscribers!`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    try {
      setTestSending(true);
      setError(null);
      setSuccess(null);

      await post('/newsletter/test-send', { email: testEmail });

      setSuccess(`Test newsletter sent to ${testEmail}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Test send failed');
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <Flex justifyContent="center" padding={6}>
        <Loader />
      </Flex>
    );
  }

  return (
    <Box>
      {error && (
        <Box paddingBottom={4}>
          <Alert closeLabel="Close" onClose={() => setError(null)} variant="danger" title="Error">
            {error}
          </Alert>
        </Box>
      )}

      {success && (
        <Box paddingBottom={4}>
          <Alert closeLabel="Close" onClose={() => setSuccess(null)} variant="success" title="Success">
            {success}
          </Alert>
        </Box>
      )}

      {/* Stats bar */}
      {stats && (
        <Box background="neutral0" padding={4} shadow="filterShadow" hasRadius marginBottom={4}>
          <Flex gap={6}>
            <Box>
              <Typography variant="pi" textColor="neutral600">Confirmed Subscribers</Typography>
              <Typography variant="beta">{stats.subscriberCount}</Typography>
            </Box>
            <Box>
              <Typography variant="pi" textColor="neutral600">Last Send</Typography>
              <Typography variant="beta">
                {stats.lastSend ? formatDate(stats.lastSend.sentAt) : 'Never'}
              </Typography>
            </Box>
          </Flex>
        </Box>
      )}

      {/* Eligible posts */}
      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
        <Flex justifyContent="space-between" alignItems="center" paddingBottom={4}>
          <Box>
            <Typography variant="delta" as="h2">
              Eligible Posts
            </Typography>
            <Typography variant="pi" textColor="neutral600">
              Published posts that haven't been sent yet
            </Typography>
          </Box>
          <Button
            onClick={() => setShowConfirm(true)}
            loading={sending}
            disabled={sending || posts.length === 0}
            startIcon={<Check />}
            size="L"
          >
            Send Newsletter
          </Button>
        </Flex>

        {posts.length === 0 ? (
          <Typography textColor="neutral600">
            No posts are eligible for sending right now.
          </Typography>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th><Typography variant="sigma">Title</Typography></Th>
                <Th><Typography variant="sigma">Slug</Typography></Th>
                <Th><Typography variant="sigma">Published</Typography></Th>
                <Th><Typography variant="sigma">Last Updated</Typography></Th>
              </Tr>
            </Thead>
            <Tbody>
              {posts.map((p) => (
                <Tr key={p.documentId}>
                  <Td><Typography fontWeight="bold">{p.title}</Typography></Td>
                  <Td><Typography textColor="neutral600">{p.slug}</Typography></Td>
                  <Td><Typography textColor="neutral600">{formatDate(p.publishedDate)}</Typography></Td>
                  <Td><Typography textColor="neutral600">{formatDate(p.updatedAt)}</Typography></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Test send */}
      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius marginTop={4}>
        <Typography variant="delta" as="h2" paddingBottom={4}>
          Test Send
        </Typography>
        <Typography variant="pi" textColor="neutral600" paddingBottom={4}>
          Send eligible posts to a specific email address without marking them as sent.
        </Typography>
        <Flex gap={2} alignItems="flex-end" paddingTop={2}>
          <Box style={{ flex: 1 }}>
            <Field.Root name="testEmail">
              <Field.Label>Test email</Field.Label>
              <TextInput
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e: any) => setTestEmail(e.target.value)}
              />
            </Field.Root>
          </Box>
          <Button
            onClick={handleTestSend}
            loading={testSending}
            disabled={testSending || !testEmail}
            variant="secondary"
          >
            Send Test
          </Button>
        </Flex>
      </Box>

      {/* Confirmation dialog */}
      <Dialog.Root open={showConfirm} onOpenChange={setShowConfirm}>
        <Dialog.Content>
          <Dialog.Header>Confirm Newsletter Send</Dialog.Header>
          <Dialog.Body>
            <Typography>
              Send newsletter with {posts.length} post{posts.length !== 1 ? 's' : ''} to{' '}
              {stats?.subscriberCount || 0} subscriber{stats?.subscriberCount !== 1 ? 's' : ''}?
            </Typography>
            <Typography textColor="neutral600" paddingTop={2}>
              Posts will be marked as sent and won't be included in future newsletters.
            </Typography>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary">Cancel</Button>
            </Dialog.Cancel>
            <Dialog.Action>
              <Button onClick={handleSend} variant="danger-light">
                Send Newsletter
              </Button>
            </Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export { SendTab };
