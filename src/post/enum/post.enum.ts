export enum Post_Type {
    EXERCISE = 'EXERCISE',
    EXAM = 'EXAM',
}

export enum Question_Type {
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    ESSAY = 'ESSAY',
}

export enum View_Each_Other_Answer {
    AFTER_ANSWER = 'AFTER_ANSWER',
    AFTER_DEADLINE = 'AFTER_DEADLINE',
    NEVER = 'NEVER',
}

export enum Retake {
    BEFORE_DATELINE = 'BEFORE', // if no dateline like retake unlimited
    NEVER = 'NEVER',
}