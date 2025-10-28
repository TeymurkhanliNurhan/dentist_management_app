import { Module } from '@nestjs/common';
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
  imports: [DentistModule, PatientModule, PatientToothModule, ToothTreatmentModule, TreatmentModule, ToothModule, AppointmentModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
