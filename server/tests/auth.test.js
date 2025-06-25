import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index.js';

const prisma = new PrismaClient();

// Generate unique usernames for this test run
const uniqueAdminUsername = `TestAdmin_Auth_${Date.now()}`;
const uniqueClientUsername = `TestClient_Auth_${Date.now()}`;

// Test data
const testUser = {
  name: "AuthTestUser",
  password: "testpassword",
  role: "client"
};

const testAdmin = {
  name: "AuthTestAdmin", 
  password: "adminpassword",
  role: "gestionnaire"
};

let userToken;
let adminToken;

// Setup and teardown
beforeAll(async () => {
  // Create test users
  await prisma.user.create({
    data: {
      name: uniqueAdminUsername,
      role: "gestionnaire",
      password: "adminpassword"
    }
  });
  
  await prisma.user.create({
    data: {
      name: uniqueClientUsername,
      role: "client",
      password: "clientpassword"
    }
  });
});

afterAll(async () => {
  // Clean up test users
  await prisma.user.deleteMany({
    where: {
      name: {
        in: [uniqueAdminUsername, uniqueClientUsername]
      }
    }
  });
  
  // Close Prisma connection
  await prisma.$disconnect();
});

describe('Authentication Operations', () => {
  // Test user login
  test('Should authenticate a valid user', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        name: uniqueClientUsername,
        password: "clientpassword"
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name', uniqueClientUsername);
    expect(response.body).toHaveProperty('role', "client");
    expect(response.headers).toHaveProperty('authorization');
    
    // Save token for later tests
    userToken = response.headers.authorization.split(' ')[1];
  });
  // Test admin login
  test('Should authenticate an admin user', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        name: uniqueAdminUsername,
        password: "adminpassword"
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('role', "gestionnaire");
    
    // Save token for later tests
    adminToken = response.headers.authorization.split(' ')[1];
  });
  // Test login with invalid credentials
  test('Should reject invalid login credentials', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({
        name: uniqueClientUsername,
        password: "wrongpassword"
      });
    
    expect(response.status).toBe(401);
  });
  
}); 