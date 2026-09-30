import {
  Question_Item_Type,
  Question_Section_Type,
  getQuestionSections,
  type QuestionSectionLike,
} from './question_content.helper.js';

/**
 * Chấm điểm tự động cho một bài nộp.
 *
 * `answer_content` do FE gửi lên có shape SONG SONG với `correct_answer`
 * (không chứa `point` — điểm nằm ở `content`, BE tự lấy):
 *
 *   [ { type:'multiple_choice', items:[
 *         {type:'chose_correct', correct_options:number[]}
 *       | {type:'arrange',       correct:string[]}
 *       | {type:'pairing',       pairs:{key,value}[]}
 *       | {type:'input',         correct_answers:string[]} ] }
 *   | {type:'essay', text:string} ]
 *
 * Tự luận KHÔNG chấm tự động (`is_correct: null`, `earned_point: 0`) — giáo viên
 * chấm tay sau. Vì vậy `point` trả về có thể chỉ là phần trắc nghiệm.
 */

export interface GradedItemResult {
  type: string;
  max_point: number;
  earned_point: number;
  /** null = không chấm tự động được */
  is_correct: boolean | null;
  expected?: unknown;
  received?: unknown;
}

export interface GradedSection {
  type: string;
  /** vị trí section trong content — FE dùng để ghép với content */
  index: number;
  max_point: number;
  point: number;
  /** essay thì rỗng */
  items: GradedItemResult[];
  /** essay: đáp án mẫu */
  sample_answer?: unknown;
  /** essay: bài làm của học viên */
  answer_text?: unknown;
}

export interface GradeResult {
  point: number;
  max_point: number;
  /** LỒNG theo section để FE render thẳng, không phải đoán section nào */
  sections: GradedSection[];
  /** true = không có phần tự luận nào, điểm đã là điểm cuối */
  fully_auto_graded: boolean;
}

// ============================================================
// Chuẩn hoá để so sánh
// ============================================================

/** trim + gộp khoảng trắng + lowercase — để "  Man   Utd " === "man utd" */
function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** So sánh 2 tập index bất kể thứ tự (dùng cho chose_correct) */
function sameIndexSet(a: unknown, b: unknown): boolean {
  const setA = new Set(asArray(a).map((v) => Number(v)));
  const setB = new Set(asArray(b).map((v) => Number(v)));
  if (setA.size !== setB.size) return false;
  for (const value of setA) if (!setB.has(value)) return false;
  return true;
}

/** So sánh 2 mảng chuỗi theo đúng thứ tự (dùng cho arrange) */
function sameOrderedText(a: unknown, b: unknown): boolean {
  const listA = asArray(a).map(normalizeText);
  const listB = asArray(b).map(normalizeText);
  if (listA.length !== listB.length) return false;
  return listA.every((value, index) => value === listB[index]);
}

/** So sánh mapping key -> value bất kể thứ tự (dùng cho pairing) */
function samePairMap(a: unknown, b: unknown): boolean {
  const toMap = (pairs: unknown) => {
    const map = new Map<string, string>();
    for (const pair of asArray(pairs)) {
      if (!pair || typeof pair !== 'object') continue;
      const { key, value } = pair as { key?: unknown; value?: unknown };
      map.set(normalizeText(key), normalizeText(value));
    }
    return map;
  };

  const mapA = toMap(a);
  const mapB = toMap(b);
  if (mapA.size !== mapB.size) return false;
  for (const [key, value] of mapA) {
    if (!mapB.has(key) || mapB.get(key) !== value) return false;
  }
  return true;
}

/** Đúng khi MỌI giá trị bài nộp khớp một trong các đáp án chấp nhận */
function matchesAnyAccepted(submitted: unknown, accepted: unknown): boolean {
  const acceptedList = asArray(accepted).map(normalizeText);
  const submittedList = asArray(submitted).map(normalizeText);
  if (submittedList.length === 0) return false;
  return submittedList.every((value) => acceptedList.includes(value));
}

// ============================================================
// Chấm một item
// ============================================================

function gradeItem(input: {
  item: Record<string, any>;
  submitted: Record<string, any> | undefined;
  correct: Record<string, any> | undefined;
}): { is_correct: boolean | null; expected: unknown; received: unknown } {
  const { item, submitted, correct } = input;

  switch (item.type) {
    case Question_Item_Type.CHOSE_CORRECT:
      return {
        is_correct: sameIndexSet(
          submitted?.correct_options,
          correct?.correct_options,
        ),
        expected: correct?.correct_options ?? [],
        received: submitted?.correct_options ?? [],
      };

    case Question_Item_Type.ARRANGE:
      return {
        is_correct: sameOrderedText(submitted?.correct, correct?.correct),
        expected: correct?.correct ?? [],
        received: submitted?.correct ?? [],
      };

    case Question_Item_Type.PAIRING:
      return {
        is_correct: samePairMap(submitted?.pairs, correct?.pairs),
        expected: correct?.pairs ?? [],
        received: submitted?.pairs ?? [],
      };

    case Question_Item_Type.INPUT:
      return {
        is_correct: matchesAnyAccepted(
          submitted?.correct_answers,
          correct?.correct_answers,
        ),
        expected: correct?.correct_answers ?? [],
        received: submitted?.correct_answers ?? [],
      };

    default:
      // loại item lạ -> coi như không chấm được, tránh cộng nhầm điểm
      return { is_correct: null, expected: undefined, received: undefined };
  }
}

// ============================================================
// Entry point
// ============================================================

export function gradeAnswer(
  content: unknown,
  correct_answer: unknown,
  answer_content: unknown,
): GradeResult {
  const sections = getQuestionSections(content);
  const correctSections = asArray(correct_answer);
  const submittedSections = asArray(answer_content);

  const gradedSections: GradedSection[] = [];
  let point = 0;
  let maxPoint = 0;
  let fullyAutoGraded = true;

  sections.forEach((section: QuestionSectionLike, sectionIndex) => {
    const correctSection = correctSections[sectionIndex] as
      | Record<string, any>
      | undefined;
    const submittedSection = submittedSections[sectionIndex] as
      | Record<string, any>
      | undefined;

    // ---------- ESSAY: không chấm tự động ----------
    if (section.type === Question_Section_Type.ESSAY) {
      const max = Number(section.point) || 0;
      maxPoint += max;
      fullyAutoGraded = false;

      gradedSections.push({
        type: Question_Section_Type.ESSAY,
        index: sectionIndex,
        max_point: max,
        point: 0,
        items: [],
        sample_answer: correctSection?.sample_answer ?? '',
        answer_text: submittedSection?.text ?? '',
      });
      return;
    }

    // ---------- MULTIPLE CHOICE ----------
    const sectionItems = asArray(
      (section as Record<string, any>).items,
    ) as Record<string, any>[];

    const gradedItems: GradedItemResult[] = [];
    let sectionPoint = 0;
    let sectionMax = 0;

    sectionItems.forEach((item, itemIndex) => {
      const max = Number(item.point) || 0;
      sectionMax += max;

      const result = gradeItem({
        item,
        submitted: asArray(submittedSection?.items)[itemIndex] as
          | Record<string, any>
          | undefined,
        correct: asArray(correctSection?.items)[itemIndex] as
          | Record<string, any>
          | undefined,
      });

      if (result.is_correct === null) fullyAutoGraded = false;

      const earned = result.is_correct === true ? max : 0;
      sectionPoint += earned;

      gradedItems.push({
        type: String(item.type),
        max_point: max,
        earned_point: earned,
        is_correct: result.is_correct,
        expected: result.expected,
        received: result.received,
      });
    });

    point += sectionPoint;
    maxPoint += sectionMax;

    gradedSections.push({
      type: Question_Section_Type.MULTIPLE_CHOICE,
      index: sectionIndex,
      max_point: sectionMax,
      point: sectionPoint,
      items: gradedItems,
    });
  });

  return {
    point,
    max_point: maxPoint,
    sections: gradedSections,
    fully_auto_graded: fullyAutoGraded,
  };
}
