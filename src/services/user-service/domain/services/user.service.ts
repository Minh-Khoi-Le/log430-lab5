import { User } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async createUser(userData: Partial<User>): Promise<User> {
    const user = new User(
      0, // id will be set by database
      userData.name ?? '',
      userData.role ?? 'client',
      userData.password ?? ''
    );
    return await this.userRepository.create(user);
  }

  async getUserById(userId: number): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async updateUser(userId: number, userData: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }
    
    // Update user properties
    if (userData.name) user.name = userData.name;
    if (userData.role) user.role = userData.role;
    if (userData.password) user.password = userData.password;
    
    return await this.userRepository.update(user);
  }

  async deleteUser(userId: number): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }
    await this.userRepository.delete(userId);
    return true;
  }
}