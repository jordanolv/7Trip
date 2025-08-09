import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../infrastructure/dto/login.dto';
import { RegisterDto } from '../../infrastructure/dto/register.dto';
import { SetPasswordDto } from '../../infrastructure/dto/set-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { GoogleLinkAuthGuard } from '../guards/google-link-auth.guard';
import { User } from '../../../users/domain/entities/user.entity';

interface RequestWithUser {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  refresh(@Request() req: RequestWithUser) {
    return this.authService.refreshToken(req.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout() {
    return { message: 'Logout successful' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  googleAuthCallback(@Request() req, @Res() res) {
    if (!req.user) {
      return res.redirect(`
        ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error`);
    }
    const authResponse = this.authService.googleLogin(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${authResponse.accessToken}&refresh_token=${authResponse.refreshToken}`;
    res.redirect(redirectUrl);
  }

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  setPassword(@Request() req: RequestWithUser, @Body() setPasswordDto: SetPasswordDto) {
    return this.authService.setPassword(req.user.id, setPasswordDto.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: RequestWithUser): User {
    return req.user;
  }

  @Get('link-google')
  @UseGuards(JwtAuthGuard)
  linkGoogle(@Request() req: RequestWithUser, @Res() res) {
    const googleAuthUrl = `http://localhost:3001/auth/link-google/start?state=${req.user.id}`;
    res.redirect(googleAuthUrl);
  }

  @Get('link-google/start')
  @UseGuards(GoogleLinkAuthGuard)
  linkGoogleStart() {
    // Guard redirects to Google with state parameter
  }

  @Get('link-google/callback')
  @UseGuards(GoogleLinkAuthGuard)
  linkGoogleCallback(@Request() req, @Res() res) {
    if (!req.user) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/profile?link=error`);
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/profile?link=success`);
    } catch (error) {
      console.error('Error linking Google account:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/profile?link=error`);
    }
  }
}
