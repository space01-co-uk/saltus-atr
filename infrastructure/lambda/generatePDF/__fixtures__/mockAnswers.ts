/**
 * Mock answer sets for testing and previewing the PDF template.
 * Uses the real question IDs from data.ts — each answer selects
 * different response options to produce different risk ratings.
 */

export interface MockAnswer {
  questionId: number
  responseId: number
}

/** All middle options → rating ~3 (Medium) */
export const mediumRiskAnswers: MockAnswer[] = [
  { questionId: 1, responseId: 3 },
  { questionId: 2, responseId: 3 },
  { questionId: 3, responseId: 3 },
  { questionId: 4, responseId: 3 },
  { questionId: 5, responseId: 3 },
  { questionId: 6, responseId: 3 },
  { questionId: 7, responseId: 3 },
  { questionId: 8, responseId: 3 },
  { questionId: 9, responseId: 3 },
  { questionId: 10, responseId: 3 },
  { questionId: 11, responseId: 3 },
  { questionId: 12, responseId: 3 },
  { questionId: 13, responseId: 3 },
]

/** All max-risk options → rating 5 (Higher) */
export const highRiskAnswers: MockAnswer[] = [
  { questionId: 1, responseId: 1 },
  { questionId: 2, responseId: 1 },
  { questionId: 3, responseId: 1 },
  { questionId: 4, responseId: 1 },
  { questionId: 5, responseId: 5 },
  { questionId: 6, responseId: 1 },
  { questionId: 7, responseId: 1 },
  { questionId: 8, responseId: 1 },
  { questionId: 9, responseId: 5 },
  { questionId: 10, responseId: 2 },
  { questionId: 11, responseId: 5 },
  { questionId: 12, responseId: 1 },
  { questionId: 13, responseId: 5 },
]

/** All min-risk options → rating 1 (Lower) */
export const lowRiskAnswers: MockAnswer[] = [
  { questionId: 1, responseId: 5 },
  { questionId: 2, responseId: 5 },
  { questionId: 3, responseId: 5 },
  { questionId: 4, responseId: 5 },
  { questionId: 5, responseId: 1 },
  { questionId: 6, responseId: 5 },
  { questionId: 7, responseId: 5 },
  { questionId: 8, responseId: 5 },
  { questionId: 9, responseId: 1 },
  { questionId: 10, responseId: 1 },
  { questionId: 11, responseId: 1 },
  { questionId: 12, responseId: 5 },
  { questionId: 13, responseId: 1 },
]
