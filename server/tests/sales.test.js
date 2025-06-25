import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Generate unique identifiers for this test run
const timestamp = Date.now();
const uniqueId = `${timestamp}_${Math.random().toString(36).substring(7)}`;

// Test data
const testStore = {
  name: `Sales Test Store ${uniqueId}`,
  address: "789 Sales Avenue"
};
const uniqueUsername = `TestAdmin_Sales_${uniqueId}`;
const uniqueClientUsername = `TestClient_Sales_${uniqueId}`;

const testClient = {
  name: uniqueClientUsername,
  role: "client",
  password: "testpassword"
};

const testAdmin = {
  name: `SalesTestAdmin_${uniqueId}`,
  role: "gestionnaire",
  password: "adminpassword"
};

const testProduct = {
  name: `Sales Test Product ${uniqueId}`,
  price: 39.99,
  description: `A product for testing sales operations ${uniqueId}`
};

let storeId;
let productId;
let clientId;
let saleId;
let clientToken;
let adminToken;
let stockId;

// Setup and teardown
beforeAll(async () => {
  // Create a test user with gestionnaire role for authentication
  await prisma.user.create({
    data: {
      name: uniqueUsername,
      role: "gestionnaire",
      password: "testpassword"
    }
  });
  
  // Login to get auth token
  const loginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: uniqueUsername,
      password: "testpassword"
    });
  
  // Extract token from response
  adminToken = loginResponse.headers.authorization?.split(' ')[1];
  
  // Create test product
  const productResponse = await request(app)
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(testProduct);
  
  productId = productResponse.body.id;
  
  // Create test store
  const storeResponse = await request(app)
    .post('/api/v1/stores')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(testStore);
  
  storeId = storeResponse.body.id;
    // Create a test client user
  const clientResponse = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(testClient);
  
  expect(clientResponse.status).toBe(201);
  clientId = clientResponse.body.id;
  
  // Login as client to get token
  const clientLoginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: testClient.name,
      password: testClient.password
    });
  
  clientToken = clientLoginResponse.headers.authorization?.split(' ')[1];
    // Create stock for the product in the store using PUT endpoint
  await request(app)
    .put(`/api/v1/stock/product/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      storeId: storeId,
      quantity: 50
    });
});

afterAll(async () => {
  // Clean up test data in the correct order to respect foreign key constraints
    // Delete sales and their lines (if they still exist)
  if (saleId) {
    try {
      await prisma.saleLine.deleteMany({
        where: { saleId: saleId }
      });
      await prisma.sale.delete({
        where: { id: saleId }
      });
    } catch (error) {
      // Sale might have been deleted by refund test, that's OK
      console.log('Sale already deleted, skipping cleanup');
    }
  }
  // Delete all stock records first (for both store and product)
  if (storeId || productId) {
    await prisma.stock.deleteMany({});
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
  
  // Delete test users
  await prisma.user.deleteMany({
    where: {
      name: {
        in: [uniqueUsername, uniqueClientUsername]
      }
    }
  });
  
  // Close Prisma connection
  await prisma.$disconnect();
});

describe('Sales Operations', () => {
  
  // Test creating a sale
  test('Should create a new sale', async () => {
    const saleData = {
      storeId: storeId,
      userId: clientId,
      lines: [
        {
          productId: productId,
          quantity: 2,
          unitPrice: testProduct.price
        }
      ]
    };
    
    const response = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(saleData);
      expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('sale');
    expect(response.body.sale).toHaveProperty('id');
    expect(response.body.sale).toHaveProperty('storeId', storeId);
    expect(response.body.sale).toHaveProperty('userId', clientId);
    expect(response.body.sale).toHaveProperty('total');
    expect(response.body.sale.total).toBe(2 * testProduct.price);
    expect(response.body.sale).toHaveProperty('lines');
    expect(Array.isArray(response.body.sale.lines)).toBe(true);
    expect(response.body.sale.lines.length).toBe(1);
    
    // Save sale ID for later tests
    saleId = response.body.sale.id;
    
    // Verify stock was updated
    const stockResponse = await request(app)
      .get(`/api/v1/stock/product/${productId}`);
    
    const updatedStock = stockResponse.body.find(s => s.storeId === storeId);
    expect(updatedStock.quantity).toBe(48); // 50 - 2
  });
  
  // Test getting all sales
  test('Should retrieve all sales (admin only)', async () => {
    const response = await request(app)
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test sale is in the list
    const foundSale = response.body.find(sale => sale.id === saleId);
    expect(foundSale).toBeDefined();
  });
  
  // Test getting sales for a specific store
  test('Should retrieve sales for a specific store', async () => {
    const response = await request(app)
      .get(`/api/v1/sales/store/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test sale is in the list
    const foundSale = response.body.find(sale => sale.id === saleId);
    expect(foundSale).toBeDefined();
  });
    // Test getting sales for a specific user/client
  test('Should retrieve sales for a specific client', async () => {
    const response = await request(app)
      .get(`/api/v1/sales/client/${clientId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test sale is in the list
    const foundSale = response.body.find(sale => sale.id === saleId);
    expect(foundSale).toBeDefined();
  });
  
  // Test refunding a sale
  test('Should refund a sale', async () => {
    const refundResponse = await request(app)
      .post('/api/v1/sales/refund')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ saleId });
      expect(refundResponse.status).toBe(200);
    expect(refundResponse.body).toHaveProperty('success', true);
    expect(refundResponse.body).toHaveProperty('message', 'Refund processed successfully');    // Wait a bit to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify stock was updated back to original level
    const stockResponse = await request(app)
      .get(`/api/v1/stock/product/${productId}`);
    
    const updatedStock = stockResponse.body.find(s => s.storeId === storeId);
    expect(updatedStock).toBeDefined();
    expect(updatedStock.quantity).toBe(50); // Should be restored to original
    
    // Verify sale is no longer in the list
    const salesResponse = await request(app)
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const foundSale = salesResponse.body.find(sale => sale.id === saleId);
    expect(foundSale).toBeUndefined();
  });
}); 