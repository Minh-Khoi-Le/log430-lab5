import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../../domain/services/user.service';
import { UserDTO } from '../../application/dtos/user.dto';
import { PrismaUserRepository } from '../database/prisma-user.repository';
import { createLogger } from '@shared/infrastructure/logging';
import { CacheService, createCacheMiddleware } from '@shared/infrastructure/caching';

// Create a logger for the UserController
const logger = createLogger('user-controller');

export class UserController {
  private readonly userService: UserService;
  private readonly cacheService: CacheService | undefined;
  public router: Router;

  constructor(cacheService?: CacheService) {
    const prisma = new PrismaClient();
    const userRepository = new PrismaUserRepository(prisma);
    this.userService = new UserService(userRepository);
    this.cacheService = cacheService;
    this.router = Router();
    this.setupRoutes();
    logger.info('UserController initialized');
  }

  private setupRoutes(): void {
    // Apply cache middleware to GET routes
    if (this.cacheService) {
      const userCache = createCacheMiddleware({ 
        cacheService: this.cacheService, 
        ttl: 600 // 10 minutes
      });
      
      this.router.post('/', this.createUser.bind(this));
      this.router.get('/:id', userCache, this.getUser.bind(this));
      this.router.put('/:id', this.updateUser.bind(this));
      this.router.delete('/:id', this.deleteUser.bind(this));
      this.router.get('/', userCache, this.getAllUsers.bind(this));
    } else {
      this.router.post('/', this.createUser.bind(this));
      this.router.get('/:id', this.getUser.bind(this));
      this.router.put('/:id', this.updateUser.bind(this));
      this.router.delete('/:id', this.deleteUser.bind(this));
      this.router.get('/', this.getAllUsers.bind(this));
    }
  }

  public async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all users');
      const users = await this.userService.getAllUsers();
      logger.info(`Retrieved ${users.length} users`);
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      logger.error('Failed to fetch all users', error as Error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userDto: UserDTO = req.body;
      logger.info('Creating new user', { name: userDto.name, role: userDto.role });
      
      const user = await this.userService.createUser(userDto);
      
      // Invalidate users list cache
      if (this.cacheService) {
        this.cacheService.delete('GET:/api/users');
        logger.info('Cache invalidated after user creation');
      }
      
      logger.info('User created successfully', { userId: user.id, name: user.name });
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      logger.error('Failed to create user', error as Error, {
        userData: req.body
      });
      
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      const user = await this.userService.getUserById(userId);
      if (user) {
        res.status(200).json({ success: true, data: user });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      const userDto: UserDTO = req.body;
      const updatedUser = await this.userService.updateUser(userId, userDto);
      
      // Invalidate user cache after update
      if (this.cacheService) {
        this.cacheService.delete(`GET:/api/users/${userId}`);
        this.cacheService.delete('GET:/api/users');
        this.cacheService.delete('GET:/api/users/me');
        logger.info('Cache invalidated after user update', { userId });
      }
      
      if (updatedUser) {
        res.status(200).json({ success: true, data: updatedUser });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] ?? '0');
      await this.userService.deleteUser(userId);
      
      // Invalidate user cache after deletion
      if (this.cacheService) {
        this.cacheService.delete(`GET:/api/users/${userId}`);
        this.cacheService.delete('GET:/api/users');
        logger.info('Cache invalidated after user deletion', { userId });
      }
      
      res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}