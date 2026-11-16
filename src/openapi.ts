export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Ziko Boutique API',
    version: '0.1.0',
    description: 'API de la boutique Ziko. Produits disponibles ; commandes et paiements à venir.',
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        required: ['id', 'name', 'priceCdf', 'stock', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          priceCdf: { type: 'integer', minimum: 0, description: 'Prix en francs congolais' },
          stock: { type: 'integer', minimum: 0 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'État du serveur et de PostgreSQL',
        responses: { '200': { description: 'Service disponible' }, '503': { description: 'Base indisponible' } },
      },
    },
    '/api/products': {
      post: {
        summary: 'Créer un produit',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['name', 'priceCdf', 'stock'], additionalProperties: false,
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 200 },
              priceCdf: { type: 'integer', minimum: 0, maximum: 2147483647 },
              stock: { type: 'integer', minimum: 0, maximum: 2147483647 },
            },
          } } },
        },
        responses: {
          '201': { description: 'Produit créé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          '400': { description: 'Données invalides' },
        },
      },
      get: {
        summary: 'Lister les produits',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000000, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'Page de produits', content: { 'application/json': { schema: {
            type: 'object', required: ['items', 'page', 'limit', 'total', 'totalPages'],
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              page: { type: 'integer' }, limit: { type: 'integer' },
              total: { type: 'integer' }, totalPages: { type: 'integer' },
            },
          } } } },
          '400': { description: 'Paramètres de pagination invalides' },
        },
      },
    },
  },
};
