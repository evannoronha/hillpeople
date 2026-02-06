import { Main, Box, Typography, Tabs } from '@strapi/design-system';
import { SendTab } from '../components/SendTab';
import { HistoryTab } from '../components/HistoryTab';
import { SettingsTab } from '../components/SettingsTab';

const HomePage = () => {
  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Box paddingBottom={6}>
          <Typography variant="alpha" as="h1">
            Newsletter
          </Typography>
          <Typography variant="epsilon" textColor="neutral600">
            Manage and send newsletters to subscribers
          </Typography>
        </Box>

        <Tabs.Root defaultValue="send">
          <Tabs.List>
            <Tabs.Trigger value="send">Send</Tabs.Trigger>
            <Tabs.Trigger value="history">History</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Box paddingTop={4}>
            <Tabs.Content value="send">
              <SendTab />
            </Tabs.Content>
            <Tabs.Content value="history">
              <HistoryTab />
            </Tabs.Content>
            <Tabs.Content value="settings">
              <SettingsTab />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
    </Main>
  );
};

export { HomePage };
