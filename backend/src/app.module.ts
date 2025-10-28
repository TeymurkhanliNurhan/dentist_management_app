import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DentistModule } from './dentist/dentist.module';
import { PatientModule } from './patient/patient.module';
import { PatientToothModule } from './patient_tooth/patient_tooth.module';
import { ToothTreatmentModule } from './tooth_treatment/tooth_treatment.module';
import { TreatmentModule } from './treatment/treatment.module';
import { ToothModule } from './tooth/tooth.module';
import { AppointmentModule } from './appointment/appointment.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    DentistModule,
    PatientModule,
    PatientToothModule,
    ToothTreatmentModule,
    TreatmentModule,
    ToothModule,
    AppointmentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
