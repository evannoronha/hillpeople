import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterCreate() {
    await invalidateCache('climbing-tick');
  },

  async afterUpdate() {
    await invalidateCache('climbing-tick');
  },

  async afterDelete() {
    await invalidateCache('climbing-tick');
  },
};
