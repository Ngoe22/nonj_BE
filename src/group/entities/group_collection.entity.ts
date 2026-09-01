import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {BaseEntity} from "../../_common/entities/base.entity.js";

import {Group} from "./group.entity.js";
import {Post} from "../../post/entities/post.entity.js";

@Index( ["createdAt"])
@Entity("group_collection")
export class GroupCollection  extends BaseEntity  {

    @PrimaryGeneratedColumn( "uuid")
    id : string

    @Column({ type :"varchar", length : 50})
    name : string

    @Index()
    @ManyToOne( () => Group, group => group.collection )
    @JoinColumn({ name: "group_id" , referencedColumnName : "id" })
    group : Group


    //

    @OneToMany(() => Post , post => post.group_collection )
    post : Post

}
