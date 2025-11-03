import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Dentist } from './src/dentist/entities/dentist.entity';
import { Patient } from './src/patient/entities/patient.entity';
import { PatientTooth } from './src/patient_tooth/entities/patient_tooth.entity';
import { Tooth } from './src/tooth/entities/tooth.entity';
import { Treatment } from './src/treatment/entities/treatment.entity';
import { ToothTreatment } from './src/tooth_treatment/entities/tooth_treatment.entity';
import { Appointment } from './src/appointment/entities/appointment.entity';
import { Medicine } from './src/medicine/entities/medicine.entity';
import { ToothTreatmentMedicine } from './src/tooth_treatment_medicine/entities/tooth_treatment_medicine.entity';
import { ToothTranslation } from './src/tooth/entities/tooth_translation.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
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
  migrations: [
    'src/migrations/*.ts',
  ],
  synchronize: false,
});


