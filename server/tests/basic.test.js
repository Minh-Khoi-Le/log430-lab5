/**
 * Basic Tests
 * 
 * This file contains basic tests to verify that the Jest configuration is working correctly
 * and test basic API functionality.
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';

describe('Basic Tests', () => {
  // Test that Jest is working
  test('Jest should be working', () => {
    expect(1 + 1).toBe(2);
  });
  
  // Test async functionality
  test('Async functions should work', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
  
  // Test mocking functionality
  test('Mocking should work', () => {
    const mockFn = jest.fn().mockReturnValue(true);
    expect(mockFn()).toBe(true);
    expect(mockFn).toHaveBeenCalled();
  });

  // Test basic server functionality
  test('Server should respond to basic requests', async () => {
    const response = await request(app).get('/api/v1/products');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  // Test API endpoints are accessible
  test('Should access stores endpoint', async () => {
    const response = await request(app).get('/api/v1/stores');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Should access sales endpoint', async () => {
    const response = await request(app).get('/api/v1/sales');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
}); 