import type { Schema, Struct } from '@strapi/strapi';

export interface ClimbingDateRange extends Struct.ComponentSchema {
  collectionName: 'components_climbing_date_ranges';
  info: {
    description: 'Embed climbing ticks from a date range in a blog post';
    displayName: 'Climbing Date Range';
    icon: 'mountain';
  };
  attributes: {
    endDate: Schema.Attribute.Date;
    showClimbingData: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    startDate: Schema.Attribute.Date & Schema.Attribute.Required;
  };
}

export interface GalleryPhoto extends Struct.ComponentSchema {
  collectionName: 'components_gallery_photos';
  info: {
    displayName: 'Gallery Photo';
    icon: 'picture';
  };
  attributes: {
    altText: Schema.Attribute.String;
    aperture: Schema.Attribute.String;
    cameraMake: Schema.Attribute.String;
    cameraModel: Schema.Attribute.String;
    caption: Schema.Attribute.Text;
    focalLength: Schema.Attribute.String;
    height: Schema.Attribute.Integer & Schema.Attribute.Required;
    iso: Schema.Attribute.String;
    lens: Schema.Attribute.String;
    r2Path: Schema.Attribute.String & Schema.Attribute.Required;
    shutterSpeed: Schema.Attribute.String;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    width: Schema.Attribute.Integer & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'SEO metadata fields';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    excerpt: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'climbing.date-range': ClimbingDateRange;
      'gallery.photo': GalleryPhoto;
      'shared.seo': SharedSeo;
    }
  }
}
