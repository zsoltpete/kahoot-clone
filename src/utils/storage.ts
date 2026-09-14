import type { Quiz } from '../types/quiz'
import { SAMPLE_QUIZ, cloneQuiz } from '../data/sampleQuiz'

const KEY = 'kvizparti-quizzes'

export function loadQuizzes(): Quiz[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const initial = [cloneQuiz(SAMPLE_QUIZ)]
      localStorage.setItem(KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as Quiz[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [cloneQuiz(SAMPLE_QUIZ)]
      localStorage.setItem(KEY, JSON.stringify(initial))
      return initial
    }
    return parsed
  } catch {
    return [cloneQuiz(SAMPLE_QUIZ)]
  }
}

export function saveQuizzes(quizzes: Quiz[]) {
  localStorage.setItem(KEY, JSON.stringify(quizzes))
}

export function upsertQuiz(quiz: Quiz) {
  const all = loadQuizzes()
  const idx = all.findIndex((q) => q.id === quiz.id)
  if (idx >= 0) all[idx] = quiz
  else all.push(quiz)
  saveQuizzes(all)
}

export function deleteQuiz(id: string) {
  saveQuizzes(loadQuizzes().filter((q) => q.id !== id))
}
