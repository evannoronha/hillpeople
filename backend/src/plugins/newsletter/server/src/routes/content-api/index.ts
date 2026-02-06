export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/confirm/:token',
      handler: 'subscriber-controller.confirm',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/unsubscribe/:token',
      handler: 'subscriber-controller.unsubscribe',
      config: { policies: [] },
    },
  ],
};
