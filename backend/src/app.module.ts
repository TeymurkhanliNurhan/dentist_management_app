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
import { MedicineModule } from './medicine/medicine.module';
import { ToothTreatmentMedicineModule } from './tooth_treatment_medicine/tooth_treatment_medicine.module';
import { ToothTranslation } from './tooth/entities/tooth_translation.entity';
// Import all entities
import { Dentist } from './dentist/entities/dentist.entity';
import { Patient } from './patient/entities/patient.entity';
import { PatientTooth } from './patient_tooth/entities/patient_tooth.entity';
import { Tooth } from './tooth/entities/tooth.entity';
import { Treatment } from './treatment/entities/treatment.entity';
import { ToothTreatment } from './tooth_treatment/entities/tooth_treatment.entity';
import { Appointment } from './appointment/entities/appointment.entity';
import { Medicine } from './medicine/entities/medicine.entity';
import { ToothTreatmentMedicine } from './tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        console.log('DATABASE_URL:', databaseUrl ? 'Set (hidden)' : 'NOT SET');
        console.log('DB_SSL:', process.env.DB_SSL);
        
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        
        // Parse PostgreSQL URL manually to handle usernames with dots
        // Format: postgresql://username:password@host:port/database
        try {
          const match = databaseUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
          
          if (!match) {
            throw new Error('Invalid PostgreSQL URL format');
          }
          
          const username = decodeURIComponent(match[1]);
          const password = decodeURIComponent(match[2]);
          const host = match[3];
          const port = parseInt(match[4]);
          const database = match[5];
          
          console.log('Parsed connection:', {
            host,
            port,
            database,
            username: username ? `${username.substring(0, 20)}...` : 'NOT SET',
            passwordSet: password ? 'Yes' : 'No',
          });
          
          return {
            type: 'postgres',
            host,
            port,
            username,
            password,
            database,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            entities: [
              Dentist,
              Patient,
              PatientTooth,
              Tooth,
              ToothTranslation,
              Treatment,
              ToothTreatment,
              Appointment,
              Medicine,
              ToothTreatmentMedicine,
            ],
            synchronize: true,
            logging: ['schema', 'error', 'warn'], // Enable schema logging to see table creation
            extra: {
              // Pool tuning for Supabase Session Pooler
              max: 5,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
              keepAlive: true,
            },
          };
        } catch (error) {
          console.error('Error parsing DATABASE_URL, falling back to URL string:', error);
          // Fallback to URL string if parsing fails
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            entities: [
              Dentist,
              Patient,
              PatientTooth,
              Tooth,
              ToothTranslation,
              Treatment,
              ToothTreatment,
              Appointment,
              Medicine,
              ToothTreatmentMedicine,
            ],
            synchronize: true,
            extra: {
              // Pool tuning for Supabase Session Pooler
              max: 5,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 10000,
              keepAlive: true,
            },
          };
        }
      },
    }),
    DentistModule,
    PatientModule,
    PatientToothModule,
    ToothTreatmentModule,
    TreatmentModule,
    ToothModule,
    AppointmentModule,
    MedicineModule,
    ToothTreatmentMedicineModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
