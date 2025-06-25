import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Test data
const testStore = {
  name: "TEST STORE",
  address: "TEST ADDRESS"
};

let storeId;
let authToken;

// Generate a unique username for this test run
const uniqueUsername = `TestAdmin_Store_${Date.now()}`;

// Setup and teardown
beforeAll(async () => {
   // Create a test user with gestionnaire role for authentication
   const user = await prisma.user.create({
    data: {
      name: uniqueUsername,
      role: "gestionnaire",
      password: "testpassword"
    }
  });  // Login to get auth token
  const loginResponse = await request(app)
    .post('/api/v1/users/login')
    .send({
      name: uniqueUsername,
      password: "testpassword"
    });
  
  // Extract token from response
  authToken = loginResponse.headers.authorization?.split(' ')[1];
});

afterAll(async () => {
  // Clean up test data
  if (storeId) {
    await prisma.stock.deleteMany({
      where: { storeId: storeId }
    });
    
    await prisma.store.delete({
      where: { id: storeId }
    });
  }
  
  // Delete test user
  await prisma.user.delete({
    where: { name: uniqueUsername }  
  });
  
  // Close Prisma connection
  await prisma.$disconnect();
});

describe('Store CRUD Operations', () => {
  
  // Test creating a store
  test('Should create a new store', async () => {
    const response = await request(app)
      .post('/api/v1/stores')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testStore);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(testStore.name);
    expect(response.body.address).toBe(testStore.address);
    
    // Save the created store ID for later tests
    storeId = response.body.id;
  });
  
  // Test getting all stores
  test('Should retrieve all stores', async () => {
    const response = await request(app)
      .get('/api/v1/stores');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verify our test store is in the list
    const foundStore = response.body.find(store => store.id === storeId);
    expect(foundStore).toBeDefined();
  });
  
  // Test getting a single store by ID
  test('Should retrieve a specific store by ID', async () => {
    const response = await request(app)
      .get(`/api/v1/stores/${storeId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', storeId);
    expect(response.body.name).toBe(testStore.name);
    expect(response.body.address).toBe(testStore.address);
  });
    // Test getting store stock
  test('Should retrieve store stock information', async () => {
    const response = await request(app)
      .get(`/api/v1/stores/${storeId}/stock`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // Stock array can be empty for a new store, so we just check it's an array
  });
}); 