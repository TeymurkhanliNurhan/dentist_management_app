import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret =
      configService.get<string>('JWT_SECRET') || 'dev_secret_change_me';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      gmail: payload.gmail,
      role: typeof payload.role === 'string' ? payload.role : undefined,
      staffId: payload.staffId ?? payload.staff_id,
      patientId: payload.patientId ?? payload.patient_id,
      clinicId: payload.clinicId ?? payload.clinic_id,
    };
  }
}
