/**
 * "Generate SEO" side panel in the post editor. Fills the SEO fields with
 * Claude-generated text for the author to review before saving.
 */
import { useState } from 'react';
import { Button, Flex, Typography } from '@strapi/design-system';
import { Sparkle } from '@strapi/icons';
import { useFetchClient, useForm, useNotification } from '@strapi/strapi/admin';
import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

const POST_UID = 'api::post.post';

interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
}

const GenerateSeo = ({ documentId }: { documentId?: string }) => {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const values = useForm('GenerateSeo', (state) => state.values) as {
    title?: string;
    richContent?: string;
    seo?: Partial<SeoFields> | null;
  };
  const onChange = useForm('GenerateSeo', (state) => state.onChange);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    const seo = values.seo ?? {};
    const hasExisting = [seo.metaTitle, seo.metaDescription, seo.excerpt].some((v) => v?.trim());
    if (hasExisting && !window.confirm('Replace the current SEO fields with generated ones?')) {
      return;
    }

    setIsGenerating(true);
    try {
      const { data } = await post<SeoFields>('/seo-assistant/generate', {
        title: values.title,
        richContent: values.richContent,
        documentId,
      });
      onChange('seo', { ...seo, ...data });
      toggleNotification({
        type: 'success',
        message: 'SEO fields filled in. Review them, then save.',
      });
    } catch (error: any) {
      toggleNotification({
        type: 'danger',
        message: error?.response?.data?.error?.message ?? 'Could not generate SEO',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={2} width="100%">
      <Typography variant="pi" textColor="neutral600">
        Write a meta title, meta description and excerpt from the post content.
      </Typography>
      <Button
        variant="secondary"
        startIcon={<Sparkle />}
        loading={isGenerating}
        onClick={handleGenerate}
        fullWidth
      >
        Generate SEO
      </Button>
    </Flex>
  );
};

export const SeoAssistantPanel: PanelComponent = ({ model, documentId }) => {
  if (model !== POST_UID) return null;
  return {
    title: 'SEO',
    content: <GenerateSeo documentId={documentId} />,
  };
};
