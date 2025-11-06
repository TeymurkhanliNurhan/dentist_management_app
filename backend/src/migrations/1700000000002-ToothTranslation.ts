import { MigrationInterface, QueryRunner } from 'typeorm';

export class ToothTranslation1700000000002 implements MigrationInterface {
    name = 'ToothTranslation1700000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "Tooth_Translation" (
            tooth int PRIMARY KEY REFERENCES "Tooth"(id) ON DELETE CASCADE,
            name_in_english varchar(30) NOT NULL,
            name_in_azerbaijani varchar(30) NOT NULL,
            name_in_russian varchar(30) NOT NULL
        );
        `);

        await queryRunner.query(`
        INSERT INTO "Tooth_Translation"(tooth, name_in_english, name_in_azerbaijani, name_in_russian) VALUES
        (1, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (2, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (3, 'Canine','İt dişi','Клык'),
        (4, '1st Molar','1-ci Azı diş','1-й моляр'),
        (5, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (6, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (7, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (8, 'Canine','İt dişi','Клык'),
        (9, '1st Molar','1-ci Azı diş','1-й моляр'),
        (10, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (11, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (12, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (13, 'Canine','İt dişi','Клык'),
        (14, '1st Molar','1-ci Azı diş','1-й моляр'),
        (15, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (16, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (17, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (18, 'Canine','İt dişi','Клык'),
        (19, '1st Molar','1-ci Azı diş','1-й моляр'),
        (20, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (21, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (22, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (23, 'Canine','İt dişi','Клык'),
        (24, '1st Premolar','1-ci Kiçik azı','1-й премоляр'),
        (25, '2nd Premolar','2-ci Kiçik azı','2-й премоляр'),
        (26, '1st Molar','1-ci Azı diş','1-й моляр'),
        (27, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (28, '3rd Molar','3-cü Azı diş','3-й моляр'),
        (29, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (30, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (31, 'Canine','İt dişi','Клык'),
        (32, '1st Premolar','1-ci Kiçik azı','1-й премоляр'),
        (33, '2nd Premolar','2-ci Kiçik azı','2-й премоляр'),
        (34, '1st Molar','1-ci Azı diş','1-й моляр'),
        (35, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (36, '3rd Molar','3-cü Azı diş','3-й моляр'),
        (37, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (38, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (39, 'Canine','İt dişi','Клык'),
        (40, '1st Premolar','1-ci Kiçik azı','1-й премоляр'),
        (41, '2nd Premolar','2-ci Kiçik azı','2-й премоляр'),
        (42, '1st Molar','1-ci Azı diş','1-й моляр'),
        (43, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (44, '3rd Molar','3-cü Azı diş','3-й моляр'),
        (45, 'Central incisor','Mərkəzi kəsici','Центральный резец'),
        (46, 'Lateral incisor','Yan kəsici','Боковой резец'),
        (47, 'Canine','İt dişi','Клык'),
        (48, '1st Premolar','1-ci Kiçik azı','1-й премоляр'),
        (49, '2nd Premolar','2-ci Kiçik azı','2-й премоляр'),
        (50, '1st Molar','1-ci Azı diş','1-й моляр'),
        (51, '2nd Molar','2-ci Azı diş','2-й моляр'),
        (52, '3rd Molar','3-cü Azı diş','3-й моляр')
        ON CONFLICT (tooth) DO NOTHING;
        `);

        await queryRunner.query(`
        DO $$ BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='Tooth' AND column_name='name'
          ) THEN
            ALTER TABLE "Tooth" DROP COLUMN "name";
          END IF;
        END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Tooth" ADD COLUMN "name" varchar(30);`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Tooth_Translation";`);
    }
}


