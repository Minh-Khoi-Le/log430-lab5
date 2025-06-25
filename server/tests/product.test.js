import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Test data
const testProduct = {
  name: "Test Product",
  price: 19.99,
  description: "A product created for testing purposes"
};

let createdProductId;
let authToken;
// Generate a unique username for this test run
const uniqueUsername = `TestAdmin_${Date.now()}`;

// Setup and teardown
beforeAll(async () => {
   // Create a test user with gestionnaire role for authentication
   const user = await prisma.user.create({
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
  authToken = loginResponse.headers.authorization?.split(' ')[1];
});

afterAll(async () => {
  // Clean up test data
  if (createdProductId) {
    try {
      await prisma.stock.deleteMany({
        where: { productId: createdProductId }
      });
      
      await prisma.product.delete({
        where: { id: createdProductId }
      });
    } catch (error) {
      // Product might already be deleted, ignore the error
      console.log('Product cleanup: Product might already be deleted');
    }
  }
  
  // Delete test user
  try {
    await prisma.user.delete({
      where: { name: uniqueUsername }
    });
  } catch (error) {
    console.log('User cleanup error:', error.message);
  }
  
  // Close Prisma connection
  await prisma.$disconnect();
});

describe('Product CRUD Operations', () => {
  
  // Test creating a product
  test('Should create a new product', async () => {
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testProduct);
      expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(testProduct.name);
    expect(response.body.price).toBe(testProduct.price);
    expect(response.body.description).toBe(testProduct.description);
    
    // Save the created product ID for later tests
    createdProductId = response.body.id;
  });
  
  // Test getting all products
  test('Should retrieve all products', async () => {
    const response = await request(app)
      .get('/api/v1/products');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
  
  // Test getting a single product by ID
  test('Should retrieve a specific product by ID', async () => {
    const response = await request(app)
      .get(`/api/v1/products/${createdProductId}`);
      expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', createdProductId);
    expect(response.body.name).toBe(testProduct.name);
  });
  
  // Test updating a product
  test('Should update an existing product', async () => {
    const updatedData = {
      name: "Updated Test Product",
      price: 24.99,
      description: "This product has been updated"
    };
    
    const response = await request(app)
      .put(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedData);
      expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', createdProductId);
    expect(response.body.name).toBe(updatedData.name);
    expect(response.body.price).toBe(updatedData.price);
    expect(response.body.description).toBe(updatedData.description);
  });
    // Test deleting a product
  test('Should delete an existing product', async () => {
    const response = await request(app)
      .delete(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(204);
    
    // Verify the product is deleted
    const getResponse = await request(app)
      .get(`/api/v1/products/${createdProductId}`);
    
    expect(getResponse.status).toBe(404);
    
    // Clear the ID since we've deleted the product
    createdProductId = null;
  });
  
  // Test creating a product with invalid data
  test('Should reject product creation with invalid data', async () => {
    const invalidProduct = {
      name: "", // Empty name is invalid
      price: -10, // Negative price is invalid
    };
    
    const response = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidProduct);
    
    expect(response.status).toBe(400);
  });
}); 