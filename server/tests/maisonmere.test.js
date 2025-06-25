import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Test data
const testProduct = {
  name: "MaisonMere Test Product",
  price: 15.99,
  description: "A product for testing parent company operations"
};

const testStore = {
  name: "MaisonMere Test Store",
  address: "789 Parent Company Street"
};

let productId;
let storeId;
let authToken;

// Generate a unique username for this test run
const uniqueUsername = `TestAdmin_MaisonMere_${Date.now()}`;

// Setup and teardown
beforeAll(async () => {
  // Create admin user
  await prisma.user.create({
    data: {
      name: uniqueUsername,
      role: "gestionnaire",
      password: "testpassword"
    }
  });
  
  // Login as admin
  const loginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: uniqueUsername,
      password: "testpassword"
    });
  
  authToken = loginResponse.headers.authorization?.split(' ')[1];
  
  // Create test product
  const productResponse = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${authToken}`)
    .send(testProduct);
  
  productId = productResponse.body.id;
  
  // Create test store
  const storeResponse = await request(app)
    .post('/api/v1/stores')
    .set('Authorization', `Bearer ${authToken}`)
    .send(testStore);
  
  storeId = storeResponse.body.id;
});

afterAll(async () => {
  // Clean up test data in the correct order to respect foreign key constraints
  
  // Delete all stock records for the store and product first
  if (storeId || productId) {
    await prisma.stock.deleteMany({
      where: { 
        OR: [
          { storeId: storeId },
          { productId: productId }
        ]
      }
    });
  }
  
  // Delete store
  if (storeId) {
    await prisma.store.delete({
      where: { id: storeId }
    });
  }
  
  // Delete product
  if (productId) {
    await prisma.product.delete({
      where: { id: productId }
    });
  }
  
  // Delete test user
  await prisma.user.delete({
    where: { name: uniqueUsername }
  });
  
  await prisma.$disconnect();
});

describe('MaisonMere (Parent Company) Operations', () => {
  
  // Test getting all products through maisonmere
  test('Should retrieve all products via maisonmere endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/maisonmere/products');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test product is in the list
    const foundProduct = response.body.find(product => product.id === productId);
    expect(foundProduct).toBeDefined();
    expect(foundProduct.name).toBe(testProduct.name);
  });
  
  // Test getting a specific product through maisonmere
  test('Should retrieve a specific product by ID via maisonmere endpoint', async () => {
    const response = await request(app)
      .get(`/api/v1/maisonmere/products/${productId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', productId);
    expect(response.body.name).toBe(testProduct.name);
    expect(response.body.price).toBe(testProduct.price);
  });
    // Test getting stats through maisonmere
  test('Should retrieve stats via maisonmere endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/maisonmere/stats');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that each store stats object has the expected properties
    if (response.body.length > 0) {
      const storeStats = response.body[0];
      expect(storeStats).toHaveProperty('id');
      expect(storeStats).toHaveProperty('name');
      expect(storeStats).toHaveProperty('totalSales');
      expect(storeStats).toHaveProperty('productsSold');
      expect(storeStats).toHaveProperty('revenue');
    }
  });
  
  // Test getting refund stats through maisonmere
  test('Should retrieve refund stats via maisonmere endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/maisonmere/refund-stats');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Check that each refund stats object has the expected properties
    if (response.body.length > 0) {
      const refundStats = response.body[0];
      expect(refundStats).toHaveProperty('id');
      expect(refundStats).toHaveProperty('name');
      expect(refundStats).toHaveProperty('count');
      expect(refundStats).toHaveProperty('total');
    }
  });
  
  // Test getting consolidated sales through maisonmere
  test('Should retrieve consolidated sales via maisonmere endpoint', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    
    const response = await request(app)
      .get(`/api/v1/maisonmere/consolidated-sales?startDate=${startDate}&endDate=${endDate}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Sales might be empty, so we just check it's an array
  });
});
