export enum Target_Type {
    POST ="POST",
    USER = "USER",
    GROUP = "GROUP",
    POST_ANSWER = "POST_ANSWER",
}


export enum Report_Reason {
    SPAM = "SPAM",
    INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
    HARASSMENT = "HARASSMENT",
    OFF_TOPIC = "OFF_TOPIC",
    OTHER = "OTHER",
}


export enum Report_Action {
    NONE = "NONE",
    CONTENT_REMOVED = "CONTENT_REMOVED",
    USER_WARNED = "USER_WARNED",
    USER_FROZEN = "USER_FROZEN",
    GROUP_CLOSED = "GROUP_CLOSED",
}


export enum Report_Status {
    PENDING = "PENDING",
    REVIEWING = "REVIEWING",
    RESOLVED = "RESOLVED",
    REJECTED = "REJECTED",
}