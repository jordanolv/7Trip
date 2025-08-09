import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../../../users/application/services/user.service';
import { User, AuthProvider } from '../../../users/domain/entities/user.entity';
import { LoginDto } from '../../infrastructure/dto/login.dto';
import { RegisterDto } from '../../infrastructure/dto/register.dto';
import { AuthResponseDto } from '../../infrastructure/dto/auth-response.dto';
import { GoogleUserDto } from '../../infrastructure/dto/google-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const userData = {
      ...registerDto,
      provider: AuthProvider.LOCAL,
    };

    const user = await this.userService.create(userData);
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || user.provider !== AuthProvider.LOCAL || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateJwt(payload: any): Promise<User> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        role: user.role,
        provider: user.provider,
        googleId: user.googleId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  refreshToken(user: User): AuthResponseDto {
    return this.generateTokens(user);
  }

  async validateGoogleUser(googleUser: GoogleUserDto): Promise<User> {
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    if (user) {
      return user;
    }

    user = await this.userService.findByEmail(googleUser.email);

    if (user) {
      const updatedUser = await this.userService.update(user.id, {
        googleId: googleUser.googleId,
        provider: AuthProvider.GOOGLE,
        profilePicture: googleUser.profilePicture,
      });
      return updatedUser;
    }

    const newUser = await this.userService.create({
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      googleId: googleUser.googleId,
      provider: AuthProvider.GOOGLE,
      profilePicture: googleUser.profilePicture,
    });

    return newUser;
  }

  googleLogin(user: User): AuthResponseDto {
    return this.generateTokens(user);
  }

  async setPassword(userId: number, password: string): Promise<User> {
    const user = await this.userService.findById(userId);

    if (user.provider !== AuthProvider.GOOGLE) {
      throw new UnauthorizedException('Only Google users can set a password');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return await this.userService.update(userId, {
      password: hashedPassword,
      provider: AuthProvider.LOCAL, // Allow both login methods
    });
  }

  async linkGoogle(userId: number, googleUser: GoogleUserDto): Promise<User> {
    const user = await this.userService.findById(userId);

    if (user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException('Only local users can link Google');
    }

    const existingGoogleUser = await this.userService.findByGoogleId(googleUser.googleId);
    if (existingGoogleUser && existingGoogleUser.id !== userId) {
      throw new UnauthorizedException('This Google account is already linked to another user');
    }

    return await this.userService.update(userId, {
      googleId: googleUser.googleId,
      profilePicture: googleUser.profilePicture,
    });
  }
}
