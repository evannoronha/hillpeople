export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/send',
      handler: 'newsletter-controller.send',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/test-send',
      handler: 'newsletter-controller.testSend',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'newsletter-controller.getSettings',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'newsletter-controller.updateSettings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/history',
      handler: 'newsletter-controller.getHistory',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/eligible-posts',
      handler: 'newsletter-controller.getEligiblePosts',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/stats',
      handler: 'newsletter-controller.getStats',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/preview',
      handler: 'newsletter-controller.preview',
      config: { policies: [] },
    },
  ],
};
