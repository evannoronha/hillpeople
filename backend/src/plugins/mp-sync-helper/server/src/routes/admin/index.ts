export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/sync-all',
      handler: 'controller.syncAll',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/quick-sync',
      handler: 'controller.quickSync',
      config: {
        policies: [],
      },
    },
  ],
};
