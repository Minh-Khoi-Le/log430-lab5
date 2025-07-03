import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserDTO } from '../dtos/user.dto';

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userData: UserDTO): Promise<User> {
    const user = new User(userData.id, userData.name, userData.role, userData.password);
    return await this.userRepository.create(user);
  }
}