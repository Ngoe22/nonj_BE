

import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {BaseEntity} from "../../_common/entities/base.entity.js";
import {User} from "../../user/entities/user.entity.js";
import { Group_Member_Role} from "../enum/group.enum.js";
import {Group} from "./group.entity.js";


@Index( [ "group_id" ,"user_id"  ] )
@Entity("group_member")
export class GroupMember  extends BaseEntity  {

    @PrimaryGeneratedColumn( "uuid")
    id : string


    @ManyToOne( () => User, user => user.group_member  )
    @JoinColumn({
        name: "user_id",
        referencedColumnName: "id",
    })
    user : User

    @ManyToOne( () => Group, group => group.group_member  )
    @JoinColumn({
        name: "group_id",
        referencedColumnName: "id",
    })
    group : Group

    @Column({
        type: "enum",
        enum : Group_Member_Role ,
        default : Group_Member_Role.USER
    })
    role : Group_Member_Role

    //

}
