import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterCreate() {
    await invalidateCache('photo-album');
  },

  async afterUpdate() {
    await invalidateCache('photo-album');
  },

  async afterDelete() {
    await invalidateCache('photo-album');
  },
};
