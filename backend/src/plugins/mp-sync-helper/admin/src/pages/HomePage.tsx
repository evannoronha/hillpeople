import { useState, useEffect } from 'react';
import {
  Main,
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
  Badge,
} from '@strapi/design-system';
import { Check, Cross } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';

interface Person {
  id: number;
  documentId: string;
  name: string;
  mountainProjectUserId: string;
  lastSyncDate: string | null;
  lastSyncError: string | null;
  lastSyncErrorDate: string | null;
}

interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  results: Array<{ person: string; result: SyncResult }>;
}

const HomePage = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { get, post } = useFetchClient();

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const { data } = await get('/content-manager/collection-types/api::person.person');
      setPeople(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch people');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setError(null);

      const { data } = await post('/mp-sync-helper/sync-all');
      setSyncResult(data as SyncResponse);

      // Refresh people to show updated sync dates
      await fetchPeople();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Box paddingBottom={4}>
          <Typography variant="alpha" as="h1">
            Mountain Project Sync
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            Sync climbing ticks from Mountain Project for all registered climbers
          </Typography>
        </Box>

        <Box paddingBottom={6}>
          <Button
            onClick={handleSync}
            loading={syncing}
            disabled={syncing || loading}
            size="L"
          >
            {syncing ? 'Syncing...' : 'Sync All Climbing Data'}
          </Button>
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

        {syncResult && (
          <Box paddingBottom={4}>
            <Alert
              closeLabel="Close"
              onClose={() => setSyncResult(null)}
              variant="success"
              title="Sync Complete"
            >
              <Box paddingTop={2}>
                {syncResult.results.map((r) => (
                  <Typography key={r.person} display="block">
                    <strong>{r.person}:</strong> {r.result.created} created, {r.result.updated} updated
                    {r.result.skipped > 0 && `, ${r.result.skipped} skipped`}
                  </Typography>
                ))}
              </Box>
            </Alert>
          </Box>
        )}

        <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
          <Typography variant="delta" as="h2" paddingBottom={4}>
            Registered Climbers
          </Typography>

          {loading ? (
            <Flex justifyContent="center" padding={6}>
              <Loader />
            </Flex>
          ) : people.length === 0 ? (
            <Typography textColor="neutral600">
              No people with Mountain Project IDs found. Add people in the Content Manager.
            </Typography>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma">Name</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">MP User ID</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Last Sync</Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma">Status</Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {people.map((person) => (
                  <Tr key={person.documentId}>
                    <Td>
                      <Typography>{person.name}</Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {person.mountainProjectUserId || '—'}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral600">
                        {formatDate(person.lastSyncDate)}
                      </Typography>
                    </Td>
                    <Td>
                      {person.lastSyncError ? (
                        <Badge backgroundColor="danger100" textColor="danger700">
                          <Flex gap={1} alignItems="center">
                            <Cross />
                            Error
                          </Flex>
                        </Badge>
                      ) : person.lastSyncDate ? (
                        <Badge backgroundColor="success100" textColor="success700">
                          <Flex gap={1} alignItems="center">
                            <Check />
                            OK
                          </Flex>
                        </Badge>
                      ) : (
                        <Badge backgroundColor="neutral150" textColor="neutral600">
                          Not synced
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Main>
  );
};

export { HomePage };
