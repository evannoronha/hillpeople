export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/upload',
      handler: 'gallery-controller.upload',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/delete',
      handler: 'gallery-controller.delete',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/browse',
      handler: 'gallery-controller.browse',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/albums',
      handler: 'gallery-controller.listAlbums',
      config: { policies: [] },
    },
  ],
};
