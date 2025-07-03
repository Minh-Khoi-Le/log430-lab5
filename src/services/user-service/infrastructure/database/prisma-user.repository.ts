import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) return null;

    return new User(
      user.id,
      user.name,
      user.role,
      user.password
    );
  }

  async findByName(name: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { name }
    });
    
    if (!user) return null;

    return new User(
      user.id,
      user.name,
      user.role,
      user.password
    );
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    
    return users.map((user: any) => 
      new User(
        user.id,
        user.name,
        user.role,
        user.password
      )
    );
  }

  async create(user: User): Promise<User> {
    const savedUser = await this.prisma.user.create({
      data: {
        name: user.name,
        role: user.role,
        password: user.password
      }
    });

    return new User(
      savedUser.id,
      savedUser.name,
      savedUser.role,
      savedUser.password
    );
  }

  async update(user: User): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        role: user.role,
        password: user.password
      }
    });

    return new User(
      updatedUser.id,
      updatedUser.name,
      updatedUser.role,
      updatedUser.password
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async findByRole(role: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { role }
    });

    return users.map((user: any) => 
      new User(
        user.id,
        user.name,
        user.role,
        user.password
      )
    );
  }
}
