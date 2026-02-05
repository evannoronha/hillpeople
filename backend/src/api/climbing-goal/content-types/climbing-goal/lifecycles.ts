import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterCreate() {
    await invalidateCache('climbing-goal');
  },

  async afterUpdate() {
    await invalidateCache('climbing-goal');
  },

  async afterDelete() {
    await invalidateCache('climbing-goal');
  },
};
