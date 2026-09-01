import {
    CreateDateColumn,
    UpdateDateColumn,
    Column, ManyToOne, JoinColumn,
} from "typeorm";
import {User} from "../../user/entities/user.entity.js";

export abstract class BaseEntity {

    @CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

    @Column({ type: "uuid", nullable: true })
    createdBy: string | null;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

    @Column({ type: "uuid", nullable: true })
    updatedBy: string | null;

    @Column({ type: "timestamp", nullable: true })
    deletedAt: Date | null;

    @Column({ type: "uuid", nullable: true })
    deletedBy: string | null;
}