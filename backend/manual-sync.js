const { DataSource } = require('typeorm');
require('dotenv').config();

// Import all entities
const Medicine = require('./dist/medicine/entities/medicine.entity').Medicine;
const ToothTreatmentMedicine = require('./dist/tooth_treatment_medicine/entities/tooth_treatment_medicine.entity').ToothTreatmentMedicine;
const Dentist = require('./dist/dentist/entities/dentist.entity').Dentist;
const Patient = require('./dist/patient/entities/patient.entity').Patient;
const PatientTooth = require('./dist/patient_tooth/entities/patient_tooth.entity').PatientTooth;
const Tooth = require('./dist/tooth/entities/tooth.entity').Tooth;
const Treatment = require('./dist/treatment/entities/treatment.entity').Treatment;
const ToothTreatment = require('./dist/tooth_treatment/entities/tooth_treatment.entity').ToothTreatment;
const Appointment = require('./dist/appointment/entities/appointment.entity').Appointment;

async function manualSync() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }
  
  // Parse connection string
  const match = databaseUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }
  
  const username = decodeURIComponent(match[1]);
  const password = decodeURIComponent(match[2]);
  const host = match[3];
  const port = parseInt(match[4]);
  const database = match[5];
  
  console.log('🔧 Creating DataSource...');
  console.log(`   Host: ${host}`);
  console.log(`   Database: ${database}`);
  console.log(`   Username: ${username.substring(0, 20)}...`);
  
  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    synchronize: true,
    logging: ['schema', 'error', 'warn', 'log'],
    entities: [
      Medicine,
      ToothTreatmentMedicine,
      Dentist,
      Patient,
      PatientTooth,
      Tooth,
      Treatment,
      ToothTreatment,
      Appointment,
    ],
  });
  
  try {
    console.log('\n🔄 Initializing connection and synchronizing...');
    await dataSource.initialize();
    console.log('✅ Connection established!');
    
    console.log('\n📊 Synchronizing schema (creating/updating tables)...');
    await dataSource.synchronize();
    console.log('✅ Schema synchronization complete!');
    
    // Verify tables were created
    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log(`\n📋 Found ${tables.length} tables:`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    
    const medicineTable = tables.find(t => t.table_name === 'Medicine');
    const junctionTable = tables.find(t => t.table_name === 'Tooth_Treatment_Medicine');
    
    if (medicineTable) {
      console.log('\n✅ Medicine table created successfully!');
    } else {
      console.log('\n❌ Medicine table NOT found');
    }
    
    if (junctionTable) {
      console.log('✅ Tooth_Treatment_Medicine table created successfully!');
    } else {
      console.log('❌ Tooth_Treatment_Medicine table NOT found');
    }
    
    await dataSource.destroy();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during synchronization:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    await dataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

manualSync();

