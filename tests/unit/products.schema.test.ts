import { describe, expect, it } from 'vitest';
import { createProductSchema, listProductsSchema } from '../../src/modules/products/products.schema.js';

describe('createProductSchema', () => {
  it('accepte un prix et un stock entiers, y compris zéro', () => {
    expect(createProductSchema.parse({ name: ' Savon ', priceCdf: 0, stock: 0 })).toEqual({
      name: 'Savon', priceCdf: 0, stock: 0,
    });
  });

  it.each([
    { name: '', priceCdf: 1, stock: 1 },
    { name: 'Savon', priceCdf: -1, stock: 1 },
    { name: 'Savon', priceCdf: 1.5, stock: 1 },
    { name: 'Savon', priceCdf: 1, stock: -1 },
    { name: 'Savon', priceCdf: 1, stock: 1, extra: true },
  ])('refuse les données invalides : %j', (input) => {
    expect(createProductSchema.safeParse(input).success).toBe(false);
  });
});

describe('listProductsSchema', () => {
  it('applique les valeurs par défaut et convertit les paramètres', () => {
    expect(listProductsSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(listProductsSchema.parse({ page: '2', limit: '5' })).toEqual({ page: 2, limit: 5 });
  });

  it.each([
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1000001' },
    { limit: '0' }, { limit: '101' }, { limit: 'abc' }, { extra: '1' },
  ])('refuse une pagination invalide : %j', (input) => {
    expect(listProductsSchema.safeParse(input).success).toBe(false);
  });
});
