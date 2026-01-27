import type { Schema, Struct } from '@strapi/strapi';

export interface SharedVideoEmbed extends Struct.ComponentSchema {
  collectionName: 'components_shared_video_embeds';
  info: {
    description: 'Embedded video (YouTube iframe, HTML5 video, etc.)';
    displayName: 'Video Embed';
  };
  attributes: {
    provider: Schema.Attribute.Enumeration<
      ['youtube', 'vimeo', 'html5', 'other']
    > &
      Schema.Attribute.DefaultTo<'other'>;
    rawHtml: Schema.Attribute.Text;
    title: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.video-embed': SharedVideoEmbed;
    }
  }
}
