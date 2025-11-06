import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationFields1700000000003 implements MigrationInterface {
    name = 'AddEmailVerificationFields1700000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('Dentist');
        
        if (table && !table.findColumnByName('isEmailVerified')) {
            await queryRunner.query(`
                ALTER TABLE "Dentist" 
                ADD COLUMN "isEmailVerified" boolean NOT NULL DEFAULT false
            `);
        }
        
        if (table && !table.findColumnByName('verificationCode')) {
            await queryRunner.query(`
                ALTER TABLE "Dentist" 
                ADD COLUMN "verificationCode" varchar(6) NULL
            `);
        }
        
        if (table && !table.findColumnByName('verificationCodeExpiry')) {
            await queryRunner.query(`
                ALTER TABLE "Dentist" 
                ADD COLUMN "verificationCodeExpiry" timestamp NULL
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Dentist" 
            DROP COLUMN "isEmailVerified",
            DROP COLUMN "verificationCode",
            DROP COLUMN "verificationCodeExpiry"
        `);
    }
}

