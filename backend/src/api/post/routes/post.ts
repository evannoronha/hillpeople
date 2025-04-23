/**
 * post router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::post.post', {
    config: {
        find: {
            middlewares: ["api::post.post-attribution-middleware"],
        },
        findOne: {
            middlewares: ["api::post.post-attribution-middleware"],
        },
    },

});
