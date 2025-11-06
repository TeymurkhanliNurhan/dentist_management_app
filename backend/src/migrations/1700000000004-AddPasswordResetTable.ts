import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddPasswordResetTable1700000000004 implements MigrationInterface {
    name = 'AddPasswordResetTable1700000000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
          new Table({
              name: "password_reset",
              columns: [
                  {
                      name: "id",
                      type: "int",
                      isPrimary: true,
                      isGenerated: true,
                      generationStrategy: "increment",
                  },
                  {
                      name: "email",
                      type: "varchar",
                      isUnique: true,
                  },
                  {
                      name: "code",
                      type: "varchar",
                  },
                  {
                      name: "verified",
                      type: "boolean",
                      default: false,
                  },
                  {
                      name: "createdAt",
                      type: "timestamp",
                      default: "now()",
                  },
              ],
          }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("password_reset");
    }

}

