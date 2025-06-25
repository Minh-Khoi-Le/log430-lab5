import UserDAO from '../dao/user.dao.js';
import SaleDAO from '../dao/sale.dao.js';
import jwt from 'jsonwebtoken';

// JWT secret key from environment variables or fallback to default (for development only)
const SECRET = process.env.JWT_SECRET || 'lab4-secret';

/**
 * Login Controller
 * 
 * Authenticates a user based on username and password.
 * Generates a JWT token and returns it in the Authorization header.
 * 
 * @param {Request} req - Express request object with login data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function login(req, res, next) {
  try {
    const { name, password } = req.body;
    
    // Check if required fields are provided
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }
    
    // Find user by name
    const user = await UserDAO.getByName(name);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Simple password check (would use bcrypt in production)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.name 
      }, 
      SECRET, 
      { expiresIn: '1h' }
    );
    
    // Set token in Authorization header
    res.set('Authorization', `Bearer ${token}`);
    
    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) { next(err); }
}

/**
 * List Users Controller
 * 
 * Retrieves a list of all users.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function list(req, res, next) {
  try {
    const users = await UserDAO.getAll();
    // Remove passwords from response
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(usersWithoutPasswords);
  } catch (err) { next(err); }
}

/**
 * Get User Controller
 * 
 * Retrieves detailed information about a specific user by ID.
 * 
 * @param {Request} req - Express request object with user ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function get(req, res, next) {
  try {
    const user = await UserDAO.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) { next(err); }
}

/**
 * Create User Controller
 * 
 * Creates a new user with the provided data.
 * 
 * @param {Request} req - Express request object with user data in body
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function create(req, res, next) {
  try {
    // Validate required fields
    if (!req.body.name || !req.body.role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    
    // Validate role
    if (req.body.role !== 'client' && req.body.role !== 'gestionnaire') {
      return res.status(400).json({ error: 'Role must be "client" or "gestionnaire"' });
    }
    
    const user = await UserDAO.create(req.body);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (err) { next(err); }
}

/**
 * Get User Sales Controller
 * 
 * Retrieves sales history for a specific user.
 * 
 * @param {Request} req - Express request object with user ID parameter
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function sales(req, res, next) {
  try {
    const sales = await SaleDAO.getByUser(req.params.id);
    res.json(sales);
  } catch (err) { next(err); }
} 