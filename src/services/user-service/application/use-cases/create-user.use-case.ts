import { User } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserDto } from '../dtos/user.dto';

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userData: UserDto): Promise<User> {
    const user = new User(userData);
    return await this.userRepository.save(user);
  }
}