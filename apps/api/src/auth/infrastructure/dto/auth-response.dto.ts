import { User } from '../../../users/domain/entities/user.entity';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}
