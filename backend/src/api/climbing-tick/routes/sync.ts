export default {
  routes: [
    {
      method: 'POST',
      path: '/climbing-ticks/sync/:personId',
      handler: 'sync.syncPerson',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/climbing-ticks/sync-all',
      handler: 'sync.syncAll',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
