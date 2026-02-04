import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterCreate() {
    await invalidateCache('person');
  },

  async afterUpdate() {
    await invalidateCache('person');
  },

  async afterDelete() {
    await invalidateCache('person');
  },
};
