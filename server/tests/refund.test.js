import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Test data
const testStore = {
  name: "Refund Test Store",
  address: "456 Refund Avenue"
};

const testClient = {
  name: "RefundTestClient",
  role: "client",
  password: "testpassword"
};

const testProduct = {
  name: "Refund Test Product",
  price: 25.99,
  description: "A product for testing refund operations"
};

let storeId;
let productId;
let clientId;
let saleId;
let refundId;
let clientToken;
let adminToken;

// Generate unique usernames for this test run
const uniqueAdminUsername = `TestAdmin_Refund_${Date.now()}`;
const uniqueClientUsername = `TestClient_Refund_${Date.now()}`;

// Setup and teardown
beforeAll(async () => {
  // Create admin user
  await prisma.user.create({
    data: {
      name: uniqueAdminUsername,
      role: "gestionnaire",
      password: "testpassword"
    }
  });
  
  // Login as admin
  const adminLoginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: uniqueAdminUsername,
      password: "testpassword"
    });
  
  adminToken = adminLoginResponse.headers.authorization?.split(' ')[1];
  
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
  
  // Create test client
  const clientResponse = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: uniqueClientUsername,
      role: "client",
      password: "testpassword"
    });
  
  clientId = clientResponse.body.id;
  
  // Login as client
  const clientLoginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: uniqueClientUsername,
      password: "testpassword"
    });
  
  clientToken = clientLoginResponse.headers.authorization?.split(' ')[1];
    // Create stock using PUT endpoint instead of POST
  await request(app)
    .put(`/api/v1/stock/product/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      storeId: storeId,
      quantity: 20
    });
  
  // Create a sale to refund
  const saleResponse = await request(app)
    .post('/api/v1/sales')
    .send({
      storeId: storeId,
      userId: clientId,
      lines: [
        {
          productId: productId,
          quantity: 2,
          unitPrice: testProduct.price
        }
      ]
    });
  
  saleId = saleResponse.body.sale.id;
});

afterAll(async () => {
  // Clean up test data in the correct order to respect foreign key constraints
  // Delete all stock records first (for both store and product)
  if (storeId || productId) {
    await prisma.stock.deleteMany({});
  }
  
  // Delete refunds and their lines
  if (refundId) {
    await prisma.refundLine.deleteMany({
      where: { refundId: refundId }
    });
    await prisma.refund.delete({
      where: { id: refundId }
    });
  }
  
  // Delete sales and their lines
  if (saleId) {
    await prisma.saleLine.deleteMany({
      where: { saleId: saleId }
    });
    await prisma.sale.delete({
      where: { id: saleId }
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
  
  // Delete test users
  await prisma.user.deleteMany({
    where: {
      name: {
        in: [uniqueAdminUsername, uniqueClientUsername]
      }
    }
  });
  
  await prisma.$disconnect();
});

describe('Refund Operations', () => {
  
  // Test creating a refund
  test('Should create a new refund', async () => {
    const refundData = {
      saleId: saleId,
      reason: "Customer not satisfied"
    };
    
    const response = await request(app)
      .post('/api/v1/refunds')
      .set('Authorization', `Bearer ${clientToken}`)
      .send(refundData);
      expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('refund');
    expect(response.body.refund).toHaveProperty('id');
    expect(response.body.refund).toHaveProperty('saleId', saleId);
    expect(response.body.refund).toHaveProperty('reason', refundData.reason);
    expect(response.body.refund).toHaveProperty('total');
    
    // Save refund ID for later tests
    refundId = response.body.refund.id;
  });
  
  // Test getting all refunds
  test('Should retrieve all refunds', async () => {
    const response = await request(app)
      .get('/api/v1/refunds')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test refund is in the list
    const foundRefund = response.body.find(refund => refund.id === refundId);
    expect(foundRefund).toBeDefined();
  });
    // Test getting refunds for a specific client
  test('Should retrieve refunds for a specific client', async () => {
    const response = await request(app)
      .get(`/api/v1/refunds/user/${clientId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test refund is in the list
    const foundRefund = response.body.find(refund => refund.id === refundId);
    expect(foundRefund).toBeDefined();
  });
  
  // Test getting refunds for a specific store
  test('Should retrieve refunds for a specific store', async () => {
    const response = await request(app)
      .get(`/api/v1/refunds/store/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test refund is in the list
    const foundRefund = response.body.find(refund => refund.id === refundId);
    expect(foundRefund).toBeDefined();
  });
}); 
