/**
 * Shape nội dung đề dùng CHUNG cho QuestionPreparation (cá nhân) và Post (nhóm).
 *
 * Một đề = mảng `section`. Mỗi section tự mang loại của nó nên KHÔNG còn
 * `question_type` ở cấp đề. Đáp án nằm ở cột `correct_answer` riêng, song song
 * theo [sectionIndex][itemIndex] — helper ở đây chỉ đọc phần `content`.
 *
 * Giá trị enum PHẢI khớp với `Question_Section_Type` ở FE
 * (`src/enum/question_preparation/question_preparation.enum.ts`).
 */
export enum Question_Section_Type {
  MULTIPLE_CHOICE = 'multiple_choice',
  ESSAY = 'essay',
}

/** Loại câu hỏi con — PHẢI khớp `Question_Item_Type` ở FE */
export enum Question_Item_Type {
  CHOSE_CORRECT = 'chose_correct',
  ARRANGE = 'arrange',
  PAIRING = 'pairing',
  INPUT = 'input',
}

export interface QuestionSectionLike {
  type: string;
  [key: string]: unknown;
}

/** Lọc ra các phần tử thực sự là section (có `type` dạng string). */
export function getQuestionSections(content: unknown): QuestionSectionLike[] {
  if (!Array.isArray(content)) return [];
  return content.filter(
    (section): section is QuestionSectionLike =>
      !!section &&
      typeof section === 'object' &&
      typeof (section as QuestionSectionLike).type === 'string',
  );
}

export function hasMultipleChoiceSection(content: unknown): boolean {
  return getQuestionSections(content).some(
    (section) => section.type === Question_Section_Type.MULTIPLE_CHOICE,
  );
}

export function hasEssaySection(content: unknown): boolean {
  return getQuestionSections(content).some(
    (section) => section.type === Question_Section_Type.ESSAY,
  );
}

/**
 * Chỉ toàn trắc nghiệm → chấm được tự động và KHOÁ chấm tay.
 * Đề có lẫn tự luận (hoặc rỗng) → phải chấm tay.
 */
export function isFullyAutoGraded(content: unknown): boolean {
  const sections = getQuestionSections(content);
  return (
    sections.length > 0 &&
    sections.every(
      (section) => section.type === Question_Section_Type.MULTIPLE_CHOICE,
    )
  );
}
