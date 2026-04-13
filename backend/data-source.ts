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
import { ToothTreatmentTeeth } from './src/tooth_treatment_teeth/entities/tooth_treatment_teeth.entity';
import { Media } from './src/media/entities/media.entity';
import { Randevue } from './src/randevue/entities/randevue.entity';
import { Clinic } from './src/clinic/entities/clinic.entity';
import { Staff } from './src/staff/entities/staff.entity';
import { Nurse } from './src/nurse/entities/nurse.entity';
import { FrontDeskWorker } from './src/front_desk_worker/entities/front_desk_worker.entity';
import { Director } from './src/director/entities/director.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    Clinic,
    Dentist,
    FrontDeskWorker,
    Director,
    Nurse,
    Staff,
    Patient,
    PatientTooth,
    Tooth,
    ToothTranslation,
    Treatment,
    ToothTreatment,
    ToothTreatmentTeeth,
    Appointment,
    Medicine,
    ToothTreatmentMedicine,
    Media,
    Randevue,
  ],
  migrations: [
    'src/migrations/*.ts',
  ],
  synchronize: false,
});


