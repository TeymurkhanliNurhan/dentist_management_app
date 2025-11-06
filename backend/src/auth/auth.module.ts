import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { PasswordReset } from './entities/password-reset.entity';
import { RedisClientProvider } from '../redis.provider';
import { Dentist } from '../dentist/entities/dentist.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([PasswordReset, Dentist]),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, RedisClientProvider],
  exports: [AuthService],
})
export class AuthModule {}
