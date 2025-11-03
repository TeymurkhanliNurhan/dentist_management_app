import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
        });
        console.log('[JwtStrategy] Initialized with secret:', (process.env.JWT_SECRET ? 'env secret' : 'default secret'));
    }

    async validate(payload: any) {
        console.log('[JwtStrategy] Validating payload:', payload);
        return { userId: payload.sub, gmail: payload.gmail };
    }
}


