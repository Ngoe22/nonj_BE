import {BaseEntity} from "../../_common/entities/base.entity.js";
import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {UserExerciseTemplate} from "../../user_exercise_template/entities/user_exercise_template.entity.js";
import {GroupCollection} from "../../group/entities/group_collection.entity.js";
import {Group} from "../../group/entities/group.entity.js";
import {PostAnswer} from "../../post_answer/entities/post_answer.entity.js";

@Index(["collection_id" , "created_at" ])
@Entity("post")
export class Post extends BaseEntity   {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne( () => User, user => user.post )
    @JoinColumn({ name: "user_id" , referencedColumnName : "id" })
    user : User

    @Column({ type :"varchar", length : 50})
    title : string

    @Column({ type :"text",nullable : true})
    description : string | null

    @Column({ type :"jsonb"})
    exercise_content : object

    @Column({ type :"timestamp",nullable : true})
    deadline_at : Date | null

    @Column({ type :"bool",default : false })
    is_retake : boolean

    @Column({ type :"bool",default : false })
    view_each_other_score : boolean

    @ManyToOne( () => UserExerciseTemplate, source_template => source_template.post )
    @JoinColumn({ name: "source_template_id" , referencedColumnName : "id" })
    source_template_id : UserExerciseTemplate


    @ManyToOne( () => Group, group => group.post )  @JoinColumn({ name: "group_id" , referencedColumnName : "id" })
    group : Group

    @ManyToOne( () => GroupCollection, group_collection => group_collection.post )
    @JoinColumn({ name: "group_collection_id" , referencedColumnName : "id" })
    group_collection : GroupCollection


    //

    @OneToMany(() => PostAnswer , post_answer => post_answer.post )
    post_answer : PostAnswer
}
