import {
    CreateDateColumn,
    UpdateDateColumn,
    Column, ManyToOne, JoinColumn, DeleteDateColumn,
} from "typeorm";
import {User} from "../../user/entities/user.entity.js";

/**
 * Mọi cột thời gian ở đây đều là `timestamptz`.
 *
 * KHÔNG đổi về `timestamp`: kiểu đó không mang múi giờ, nên giá trị lưu phụ
 * thuộc vào múi giờ của tiến trình lúc ghi — đọc lại ở múi giờ khác là lệch
 * ngay (VN từng bị lệch đúng 7 giờ). `timestamptz` lưu mốc tuyệt đối nên đúng
 * ở mọi môi trường và mọi người dùng trên thế giới.
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