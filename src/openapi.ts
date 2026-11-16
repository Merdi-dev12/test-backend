export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Ziko Boutique API',
    version: '0.1.0',
    description: 'API de la boutique Ziko. Produits et commandes disponibles ; paiement à venir.',
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
      Order: {
        type: 'object',
        required: ['id', 'productId', 'quantity', 'unitPriceCdf', 'totalCdf', 'status', 'createdAt', 'paidAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer', minimum: 1 },
          unitPriceCdf: { type: 'integer', minimum: 0 },
          totalCdf: { type: 'integer', minimum: 0 },
          status: { type: 'string', enum: ['PENDING', 'PAID'] },
          createdAt: { type: 'string', format: 'date-time' },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
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
    '/api/orders': {
      post: {
        summary: 'Créer une commande pour un produit',
        description: 'Vérifie le stock sans le réserver. La commande démarre en attente.',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['productId', 'quantity'], additionalProperties: false,
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, maximum: 1000000 },
          },
        } } } },
        responses: {
          '201': { description: 'Commande créée', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          '400': { description: 'Données invalides' },
          '404': { description: 'Produit introuvable' },
          '409': { description: 'Stock insuffisant' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        summary: 'Consulter une commande et son statut',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Commande trouvée', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          '400': { description: 'Identifiant invalide' },
          '404': { description: 'Commande introuvable' },
        },
      },
    },
  },
};
