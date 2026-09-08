import {
    CreateDateColumn,
    UpdateDateColumn,
    Column, ManyToOne, JoinColumn, DeleteDateColumn,
} from "typeorm";
import {User} from "../../user/entities/user.entity.js";

export abstract class BaseEntity {

    @CreateDateColumn({ type: "timestamp" })
    created_at: Date;

    @Column({ type: "uuid", nullable: true })
    created_by: string | null;

    @UpdateDateColumn({ type: "timestamp" })
    updated_at: Date;

    @Column({ type: "uuid", nullable: true })
    updated_by: string | null;

    @DeleteDateColumn({ type: 'timestamp' })
    deleted_at: Date | null;

    @Column({ type: "uuid", nullable: true })
    deleted_by: string | null;
}