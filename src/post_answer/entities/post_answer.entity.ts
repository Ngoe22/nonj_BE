import {BaseEntity} from "../../_common/entities/base.entity.js";
import {Column, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {Post} from "../../post/entities/post.entity.js";
import {Post_Answer_Status} from "../enum/post_answer.enum.js";

export class PostAnswer  extends BaseEntity {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne( () => User, user => user.post_answer )
    @JoinColumn({ name: "user_id" , referencedColumnName : "id" })
    user : User


    @ManyToOne( () => Post, post => post.post_answer )
    @JoinColumn({ name: "post_id" , referencedColumnName : "id" })
    post : Post

    @Column({ type :"jsonb"})
    content : object

    @Column({ nullable : true})
    @ManyToOne( () => User, user_graded => user_graded.post_answer_graded )
    @JoinColumn({ name: "graded_by" , referencedColumnName : "id" })
    graded_by : User

    @Column({ type :"timestamp",nullable : true})
    graded_at : Date | null

    @Column({ type :"text"})
    reviewer_comment : string

    @Column({ type :"enum",enum : Post_Answer_Status,default : Post_Answer_Status.PENDING})
    status : Post_Answer_Status
}
