import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class UserDAO {
  /**
   * Get all users
   * 
   * @returns {Promise<Array>} List of all users
   */
  static async getAll() {
    return prisma.user.findMany();
  }

  /**
   * Get a user by ID
   * 
   * @param {number|string} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async getById(id) {
    return prisma.user.findUnique({
      where: { id: Number(id) }
    });
  }

  /**
   * Get a user by name
   * 
   * @param {string} name - User name
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async getByName(name) {
    return prisma.user.findUnique({
      where: { name }
    });
  }

  /**
   * Create a new user
   * 
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user object
   */
  static async create(data) {
    return prisma.user.create({
      data: {
        name: data.name,
        role: data.role,
        password: data.password || 'password' // Default password if not provided
      }
    });
  }

  /**
   * Update a user
   * 
   * @param {number|string} id - User ID
   * @param {Object} data - User data to update
   * @returns {Promise<Object>} Updated user object
   */
  static async update(id, data) {
    return prisma.user.update({
      where: { id: Number(id) },
      data
    });
  }

  /**
   * Delete a user
   * 
   * @param {number|string} id - User ID
   * @returns {Promise<Object>} Deleted user object
   */
  static async delete(id) {
    return prisma.user.delete({
      where: { id: Number(id) }
    });
  }
}

export default UserDAO; 