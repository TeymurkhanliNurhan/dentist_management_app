import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTeeth1700000000000 implements MigrationInterface {
    name = 'SeedTeeth1700000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO "Tooth" (id, number, permanent, upper_jaw, name) VALUES
        (1, 51, false, true,  'Central incisor'),
        (2, 52, false, true,  'Lateral incisor'),
        (3, 53, false, true,  'Canine'),
        (4, 54, false, true,  '1st Molar'),
        (5, 55, false, true,  '2nd Molar'),
        (6, 61, false, true,  'Central incisor'),
        (7, 62, false, true,  'Lateral incisor'),
        (8, 63, false, true,  'Canine'),
        (9, 64, false, true,  '1st Molar'),
        (10, 65, false, true, '2nd Molar'),
        (11, 71, false, false, 'Central incisor'),
        (12, 72, false, false, 'Lateral incisor'),
        (13, 73, false, false, 'Canine'),
        (14, 74, false, false, '1st Molar'),
        (15, 75, false, false, '2nd Molar'),
        (16, 81, false, false, 'Central incisor'),
        (17, 82, false, false, 'Lateral incisor'),
        (18, 83, false, false, 'Canine'),
        (19, 84, false, false, '1st Molar'),
        (20, 85, false, false, '2nd Molar');

        INSERT INTO "Tooth" (id, number, permanent, upper_jaw, name) VALUES
        (21, 11, true, true,  'Central incisor'),
        (22, 12, true, true,  'Lateral incisor'),
        (23, 13, true, true,  'Canine'),
        (24, 14, true, true,  '1st Premolar'),
        (25, 15, true, true,  '2nd Premolar'),
        (26, 16, true, true,  '1st Molar'),
        (27, 17, true, true,  '2nd Molar'),
        (28, 18, true, true,  '3rd Molar'),
        (29, 21, true, true,  'Central incisor'),
        (30, 22, true, true,  'Lateral incisor'),
        (31, 23, true, true,  'Canine'),
        (32, 24, true, true,  '1st Premolar'),
        (33, 25, true, true,  '2nd Premolar'),
        (34, 26, true, true,  '1st Molar'),
        (35, 27, true, true,  '2nd Molar'),
        (36, 28, true, true,  '3rd Molar'),
        (37, 31, true, false, 'Central incisor'),
        (38, 32, true, false, 'Lateral incisor'),
        (39, 33, true, false, 'Canine'),
        (40, 34, true, false, '1st Premolar'),
        (41, 35, true, false, '2nd Premolar'),
        (42, 36, true, false, '1st Molar'),
        (43, 37, true, false, '2nd Molar'),
        (44, 38, true, false, '3rd Molar'),
        (45, 41, true, false, 'Central incisor'),
        (46, 42, true, false, 'Lateral incisor'),
        (47, 43, true, false, 'Canine'),
        (48, 44, true, false, '1st Premolar'),
        (49, 45, true, false, '2nd Premolar'),
        (50, 46, true, false, '1st Molar'),
        (51, 47, true, false, '2nd Molar'),
        (52, 48, true, false, '3rd Molar');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "Tooth" WHERE id BETWEEN 1 AND 52;`);
    }
}


