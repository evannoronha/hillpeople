import { invalidateCache } from '../../../../utils/cache-invalidation';

export default {
  async afterUpdate() {
    await invalidateCache('about');
  },
};
