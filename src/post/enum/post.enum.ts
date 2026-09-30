export enum Post_Type {
    EXERCISE = 'EXERCISE',
    EXAM = 'EXAM',
}

// Question_Type đã bỏ: loại câu hỏi giờ do TỪNG SECTION trong `content` mang,
// xem Question_Section_Type ở _common/helper/question_content.helper.ts

export enum View_Each_Other_Answer {
    AFTER_ANSWER = 'AFTER_ANSWER',
    AFTER_DEADLINE = 'AFTER_DEADLINE',
    NEVER = 'NEVER',
}

export enum Retake {
    BEFORE_DATELINE = 'BEFORE', // if no dateline like retake unlimited
    NEVER = 'NEVER',
}