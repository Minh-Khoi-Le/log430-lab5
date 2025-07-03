import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CacheService } from '../../../../shared/infrastructure/caching';
import { createLogger } from '../../../../shared/infrastructure/logging';

// Create a logger for the AuthController
const logger = createLogger('auth-controller');

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

export class AuthController {
  private readonly cacheService: CacheService | undefined;
  
  constructor(
    private readonly prisma: PrismaClient,
    cacheService?: CacheService
  ) {
    this.cacheService = cacheService;
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { name, password } = req.body;

      // Find user by name
      const user = await this.prisma.user.findUnique({
        where: { name }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name, 
          role: user.role 
        },
        process.env['JWT_SECRET'] ?? 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Return user data and token (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, password, role = 'client' } = req.body;

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { name }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User already exists'
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          name,
          password: hashedPassword,
          role
        }
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          name: user.name, 
          role: user.role 
        },
        process.env['JWT_SECRET'] ?? 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Return user data and token (excluding password)
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: userWithoutPassword,
        token: token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
