export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Ziko Boutique API',
    version: '0.1.0',
    description: 'Initialisation du backend. Les routes métier seront documentées lors de leur implémentation.',
  },
  paths: {
    '/health': {
      get: {
        summary: 'État du serveur et de PostgreSQL',
        responses: { '200': { description: 'Service disponible' }, '503': { description: 'Base indisponible' } },
      },
    },
  },
};
