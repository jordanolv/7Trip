import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/services/auth.service';
import { GoogleUserDto } from '../dto/google-user.dto';

interface GoogleProfile {
  id: string;
  name: {
    givenName: string;
    familyName: string;
  };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}

@Injectable()
export class GoogleLinkStrategy extends PassportStrategy(Strategy, 'google-link') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('GOOGLE_LINK_CALLBACK_URL') || 'http://localhost:3001/auth/link-google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: { query: { state?: string } },
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const userId = req.query.state ? parseInt(req.query.state, 10) : null;

      if (!userId) {
        throw new UnauthorizedException('Missing user context for linking');
      }

      const { id, name, emails, photos } = profile;

      const googleUser: GoogleUserDto = {
        googleId: id,
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        profilePicture: photos[0].value,
      };

      const linkedUser = await this.authService.linkGoogle(userId, googleUser);
      done(null, linkedUser);
    } catch (error) {
      done(error as Error, false);
    }
  }
}
