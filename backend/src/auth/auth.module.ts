import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { PasswordReset } from './entities/password-reset.entity';
import { RedisClientProvider } from '../redis.provider';
import { PatientAuthController } from './patient-auth.controller';
import { PatientAuthService } from './patient-auth.service';
import { PatientModule } from '../patient/patient.module';

function resolveJwtSecret(configService: ConfigService): string {
  return configService.get<string>('JWT_SECRET') || 'dev_secret_change_me';
}

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: resolveJwtSecret(configService),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    TypeOrmModule.forFeature([PasswordReset]),
    EmailModule,
    PatientModule,
  ],
  controllers: [AuthController, PatientAuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, RedisClientProvider, PatientAuthService],
  exports: [AuthService],
})
export class AuthModule {}
