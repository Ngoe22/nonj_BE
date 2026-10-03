import { MigrationInterface, QueryRunner } from "typeorm";

/**
 */
export class OptimizeIndexes1791019407645 implements MigrationInterface {
    name = 'OptimizeIndexes1791019407645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Xoá index thừa ──
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d3240eaf64d34439513e46cb49"`); // group.slug (non-unique)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d34106f8ec1ebaf66f4f8609dd"`); // user.user_name (non-unique)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`); // user.email (non-unique)
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_37d2ace7f95c1dd0ae665a570d"`); // friend_request.sender_id (đơn lẻ)

        // ── Thêm index cho FK ──
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8d905c648b04edeb13aa3c2996" ON "post_answer" ("graded_by")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_52378a74ae3724bcab44036645" ON "post" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6d0d5abc465edbc42e054d0bb7" ON "post" ("group_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c5c7c831ea767e9d824b21525e" ON "friendship" ("source_request_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c6686efa4cd49fa9a429f01bac" ON "report" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6bbe63d2fe75e7f0ba1710351d" ON "refresh_token" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_05ff5fc27c5ae0e93196f7062c" ON "forget_password_otp" ("user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_05ff5fc27c5ae0e93196f7062c"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6bbe63d2fe75e7f0ba1710351d"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_c6686efa4cd49fa9a429f01bac"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_c5c7c831ea767e9d824b21525e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_6d0d5abc465edbc42e054d0bb7"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_52378a74ae3724bcab44036645"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_8d905c648b04edeb13aa3c2996"`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_37d2ace7f95c1dd0ae665a570d" ON "friend_request" USING btree ("sender_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" USING btree ("email")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d34106f8ec1ebaf66f4f8609dd" ON "user" USING btree ("user_name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d3240eaf64d34439513e46cb49" ON "group" USING btree ("slug")`);
    }

}
