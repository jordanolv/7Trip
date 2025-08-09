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
  Query,
} from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { LoginDto } from '../../infrastructure/dto/login.dto';
import { RegisterDto } from '../../infrastructure/dto/register.dto';
import { SetPasswordDto } from '../../infrastructure/dto/set-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
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
  linkGoogle(@Query('token') token: string, @Res() res) {
    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    try {
      // Verify the JWT token
      const payload = this.authService.verifyToken(token);
      const googleAuthUrl = `http://localhost:8001/auth/link-google/start?state=${payload.sub}`;
      res.redirect(googleAuthUrl);
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  @Get('link-google/start')
  linkGoogleStart(@Query('state') state: string, @Res() res) {
    if (!state) {
      return res.status(400).json({ message: 'State parameter required' });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl = process.env.GOOGLE_LINK_CALLBACK_URL || 'http://localhost:8001/auth/link-google/callback';

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `response_type=code&` +
      `scope=email profile&` +
      `state=${state}`;

    console.log('Redirecting to Google with state:', state);
    res.redirect(googleAuthUrl);
  }

  @Get('link-google/callback')
  async linkGoogleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return res.redirect(`${frontendUrl}/auth/link-callback?error=true`);
    }

    try {
      const userId = parseInt(state, 10);
      if (!userId) {
        console.error('Invalid state parameter:', state);
        return res.redirect(`${frontendUrl}/auth/link-callback?error=true`);
      }

      // Exchange code for tokens
      const googleProfile = await this.authService.exchangeCodeForProfile(code);

      // Link the Google account
      await this.authService.linkGoogle(userId, googleProfile);

      res.redirect(`${frontendUrl}/auth/google-link?link=success`);
    } catch (error) {
      console.error('Error linking Google account:', error);

      // Check if it's an email mismatch error
      if (error.message === 'Google email must match your account email') {
        return res.redirect(`${frontendUrl}/auth/google-link?link=email_mismatch`);
      }

      return res.redirect(`${frontendUrl}/auth/google-link?link=error`);
    }
  }
}
