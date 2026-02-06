import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Flex,
  Alert,
  Loader,
  TextInput,
  Textarea,
  Toggle,
  NumberInput,
  Field,
  Grid,
} from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface Settings {
  senderName: string;
  senderEmail: string;
  headingText: string;
  headingColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  footerText: string;
  cronEnabled: boolean;
  cronIntervalMinutes: number;
  cooldownMinutes: number;
}

const DEFAULTS: Settings = {
  senderName: 'Hill People',
  senderEmail: 'web@hillpeople.net',
  headingText: 'New from Hill People',
  headingColor: '#643f41',
  linkColor: '#f16e53',
  buttonColor: '#627f7c',
  buttonTextColor: '#f4f2ec',
  footerText: 'You received this because you subscribed to Hill People newsletter.',
  cronEnabled: true,
  cronIntervalMinutes: 30,
  cooldownMinutes: 30,
};

const ColorSwatch = ({ color }: { color: string }) => (
  <Box
    style={{
      width: 32,
      height: 32,
      borderRadius: 4,
      backgroundColor: color,
      border: '1px solid #ddd',
      flexShrink: 0,
      marginTop: 26,
    }}
  />
);

const SettingsTab = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { get, put } = useFetchClient();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await get('/newsletter/settings');
      if (data && Object.keys(data).length > 0) {
        setSettings({ ...DEFAULTS, ...data });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await put('/newsletter/settings', settings);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
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
          <Alert closeLabel="Close" onClose={() => setSuccess(false)} variant="success" title="Saved">
            Settings saved successfully. Note: cron interval changes require a Strapi restart.
          </Alert>
        </Box>
      )}

      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
        <Typography variant="delta" as="h2">
          Sender
        </Typography>
        <Box paddingTop={4}>
          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="senderName">
                <Field.Label>Sender Name</Field.Label>
                <TextInput
                  value={settings.senderName}
                  onChange={(e: any) => updateField('senderName', e.target.value)}
                />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="senderEmail">
                <Field.Label>Sender Email</Field.Label>
                <TextInput
                  value={settings.senderEmail}
                  onChange={(e: any) => updateField('senderEmail', e.target.value)}
                />
              </Field.Root>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Box>

      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius marginTop={4}>
        <Typography variant="delta" as="h2">
          Newsletter Template
        </Typography>
        <Box paddingTop={4}>
          <Grid.Root gap={4}>
            <Grid.Item col={12} direction="column" alignItems="stretch">
              <Field.Root name="headingText">
                <Field.Label>Heading Text</Field.Label>
                <TextInput
                  value={settings.headingText}
                  onChange={(e: any) => updateField('headingText', e.target.value)}
                />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={3} s={6} direction="column" alignItems="stretch">
              <Flex gap={2}>
                <Box style={{ flex: 1 }}>
                  <Field.Root name="headingColor">
                    <Field.Label>Heading Color</Field.Label>
                    <TextInput
                      value={settings.headingColor}
                      onChange={(e: any) => updateField('headingColor', e.target.value)}
                    />
                  </Field.Root>
                </Box>
                <ColorSwatch color={settings.headingColor} />
              </Flex>
            </Grid.Item>
            <Grid.Item col={3} s={6} direction="column" alignItems="stretch">
              <Flex gap={2}>
                <Box style={{ flex: 1 }}>
                  <Field.Root name="linkColor">
                    <Field.Label>Link Color</Field.Label>
                    <TextInput
                      value={settings.linkColor}
                      onChange={(e: any) => updateField('linkColor', e.target.value)}
                    />
                  </Field.Root>
                </Box>
                <ColorSwatch color={settings.linkColor} />
              </Flex>
            </Grid.Item>
            <Grid.Item col={3} s={6} direction="column" alignItems="stretch">
              <Flex gap={2}>
                <Box style={{ flex: 1 }}>
                  <Field.Root name="buttonColor">
                    <Field.Label>Button Color</Field.Label>
                    <TextInput
                      value={settings.buttonColor}
                      onChange={(e: any) => updateField('buttonColor', e.target.value)}
                    />
                  </Field.Root>
                </Box>
                <ColorSwatch color={settings.buttonColor} />
              </Flex>
            </Grid.Item>
            <Grid.Item col={3} s={6} direction="column" alignItems="stretch">
              <Flex gap={2}>
                <Box style={{ flex: 1 }}>
                  <Field.Root name="buttonTextColor">
                    <Field.Label>Button Text Color</Field.Label>
                    <TextInput
                      value={settings.buttonTextColor}
                      onChange={(e: any) => updateField('buttonTextColor', e.target.value)}
                    />
                  </Field.Root>
                </Box>
                <ColorSwatch color={settings.buttonTextColor} />
              </Flex>
            </Grid.Item>
            <Grid.Item col={12} direction="column" alignItems="stretch">
              <Field.Root name="footerText">
                <Field.Label>Footer Text</Field.Label>
                <Textarea
                  value={settings.footerText}
                  onChange={(e: any) => updateField('footerText', e.target.value)}
                />
              </Field.Root>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Box>

      <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius marginTop={4}>
        <Typography variant="delta" as="h2">
          Automation
        </Typography>
        <Box paddingTop={4}>
          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
              <Field.Root name="cronEnabled">
                <Field.Label>Auto-send enabled</Field.Label>
                <Toggle
                  onLabel="On"
                  offLabel="Off"
                  checked={settings.cronEnabled}
                  onChange={(e: any) => updateField('cronEnabled', e.target.checked)}
                />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={4} s={6} direction="column" alignItems="stretch">
              <Field.Root name="cronIntervalMinutes">
                <Field.Label>Check interval (minutes)</Field.Label>
                <NumberInput
                  value={settings.cronIntervalMinutes}
                  onValueChange={(value: number) => updateField('cronIntervalMinutes', value)}
                  step={5}
                  min={5}
                />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={4} s={6} direction="column" alignItems="stretch">
              <Field.Root name="cooldownMinutes">
                <Field.Label>Post cooldown (minutes)</Field.Label>
                <NumberInput
                  value={settings.cooldownMinutes}
                  onValueChange={(value: number) => updateField('cooldownMinutes', value)}
                  step={5}
                  min={5}
                />
              </Field.Root>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Box>

      <Box paddingTop={4}>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export { SettingsTab };
