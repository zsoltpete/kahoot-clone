import type { Quiz } from '../types/quiz'

function q(
  id: string,
  text: string,
  answers: [string, string, string?, string?],
  correct: number,
  timeLimit = 20,
) {
  const texts = answers.filter((a): a is string => Boolean(a))
  return {
    id,
    text,
    timeLimit,
    answers: texts.map((t, i) => ({ text: t, correct: i === correct })),
  }
}

/** Preloaded Hungarian/general trivia sample quiz. */
export const SAMPLE_QUIZ: Quiz = {
  id: 'sample-trivia',
  title: 'Általános műveltség',
  randomizeAnswers: true,
  questions: [
    q('1', 'Mi Magyarország fővárosa?', ['Budapest', 'Debrecen', 'Szeged', 'Pécs'], 0),
    q('2', 'Hány kontinens van a Földön?', ['5', '6', '7', '8'], 2),
    q('3', 'Ki festette a Mona Lisát?', ['Van Gogh', 'Leonardo da Vinci', 'Picasso', 'Rembrandt'], 1),
    q('4', 'Melyik bolygó a Naprendszer legnagyobbika?', ['Föld', 'Mars', 'Jupiter', 'Szaturnusz'], 2),
    q('5', 'Milyen színűek a Kahoot gombjai sorrendben?', ['Piros, kék, sárga, zöld', 'Kék, piros, zöld, sárga', 'Zöld, sárga, piros, kék'], 0, 25),
    q('6', 'Mikor volt a Holdra szállás?', ['1965', '1969', '1972', '1959'], 1),
    q('7', 'Mi a H2O?', ['Só', 'Víz', 'Oxigén', 'Hidrogén'], 1, 15),
    q('8', 'Hány oldalú a hexagon?', ['4', '5', '6', '8'], 2, 15),
  ],
}

export function cloneQuiz(quiz: Quiz): Quiz {
  return structuredClone(quiz)
}

export function newEmptyQuiz(): Quiz {
  return {
    id: crypto.randomUUID(),
    title: 'Új kvíz',
    randomizeAnswers: false,
    questions: [
      {
        id: crypto.randomUUID(),
        text: '',
        timeLimit: 20,
        answers: [
          { text: '', correct: true },
          { text: '', correct: false },
        ],
      },
    ],
  }
}
