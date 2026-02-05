import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterCreate(event: { result: { slug?: string } }) {
    await invalidateCache('post', { slug: event.result.slug });
  },

  async afterUpdate(event: { result: { slug?: string } }) {
    await invalidateCache('post', { slug: event.result.slug });
  },

  async afterDelete(event: { result: { slug?: string } }) {
    await invalidateCache('post', { slug: event.result.slug });
  },
};
