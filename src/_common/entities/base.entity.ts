import {
    CreateDateColumn,
    UpdateDateColumn,
    Column, ManyToOne, JoinColumn, DeleteDateColumn,
} from "typeorm";
import {User} from "../../user/entities/user.entity.js";

/**
 * `timestamptz`. tránh lệch múi giờ
 *
 */
export abstract class BaseEntity {

    @CreateDateColumn({ type: "timestamptz" })
    created_at: Date;

    @Column({ type: "uuid", nullable: true })
    created_by: string | null;

    @UpdateDateColumn({ type: "timestamptz" })
    updated_at: Date;

    @Column({ type: "uuid", nullable: true })
    updated_by: string | null;

    @DeleteDateColumn({ type: 'timestamptz' })
    deleted_at: Date | null;

    @Column({ type: "uuid", nullable: true })
    deleted_by: string | null;
}