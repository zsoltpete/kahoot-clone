import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Quiz, Question, Answer } from '../types/quiz'
import { loadQuizzes, upsertQuiz, deleteQuiz } from '../utils/storage'
import { newEmptyQuiz, cloneQuiz, SAMPLE_QUIZ } from '../data/sampleQuiz'

export function HostSetup() {
  const nav = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [editing, setEditing] = useState<Quiz | null>(null)

  useEffect(() => {
    setQuizzes(loadQuizzes())
  }, [])

  const refresh = () => setQuizzes(loadQuizzes())

  const startEdit = (q: Quiz) => setEditing(structuredClone(q))
  const createNew = () => setEditing(newEmptyQuiz())
  const loadSample = () => {
    const s = cloneQuiz(SAMPLE_QUIZ)
    s.id = crypto.randomUUID()
    upsertQuiz(s)
    refresh()
  }

  const saveEdit = () => {
    if (!editing) return
    if (!editing.title.trim()) {
      alert('Adj címet a kvíznek!')
      return
    }
    for (const q of editing.questions) {
      if (!q.text.trim()) {
        alert('Minden kérdésnek legyen szövege!')
        return
      }
      const filled = q.answers.filter((a) => a.text.trim())
      if (filled.length < 2) {
        alert('Legalább 2 válasz kell kérdésenként!')
        return
      }
      if (!q.answers.some((a) => a.correct && a.text.trim())) {
        alert('Jelöld meg a helyes választ!')
        return
      }
    }
    // Trim empty trailing answers
    const cleaned: Quiz = {
      ...editing,
      title: editing.title.trim(),
      questions: editing.questions.map((q) => ({
        ...q,
        text: q.text.trim(),
        answers: q.answers
          .filter((a) => a.text.trim())
          .slice(0, 4)
          .map((a) => ({ text: a.text.trim(), correct: a.correct })),
      })),
    }
    // Ensure exactly one correct
    cleaned.questions.forEach((q) => {
      const correctIdx = q.answers.findIndex((a) => a.correct)
      q.answers.forEach((a, i) => {
        a.correct = i === (correctIdx >= 0 ? correctIdx : 0)
      })
    })
    upsertQuiz(cleaned)
    setEditing(null)
    refresh()
  }

  const remove = (id: string) => {
    if (confirm('Törölöd a kvízt?')) {
      deleteQuiz(id)
      refresh()
    }
  }

  const launch = (q: Quiz) => {
    sessionStorage.setItem('kviz-launch', JSON.stringify(q))
    nav('/host/live')
  }

  if (editing) {
    return <QuizEditor quiz={editing} onChange={setEditing} onSave={saveEdit} onCancel={() => setEditing(null)} />
  }

  return (
    <div className="page host-setup">
      <header className="topbar">
        <Link to="/" className="back">
          ← Kezdőlap
        </Link>
        <h1>Házigazda</h1>
      </header>

      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={createNew}>
          + Új kvíz
        </button>
        <button type="button" className="btn btn-ghost" onClick={loadSample}>
          Minta kvíz betöltése
        </button>
      </div>

      <div className="quiz-list">
        {quizzes.map((q) => (
          <div key={q.id} className="quiz-card">
            <div>
              <h3>{q.title}</h3>
              <p className="muted">
                {q.questions.length} kérdés
                {q.randomizeAnswers ? ' · kevert válaszok' : ''}
              </p>
            </div>
            <div className="quiz-card-actions">
              <button type="button" className="btn btn-accent" onClick={() => launch(q)}>
                Indítás
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => startEdit(q)}>
                Szerkesztés
              </button>
              <button type="button" className="btn btn-danger-ghost" onClick={() => remove(q.id)}>
                Törlés
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizEditor({
  quiz,
  onChange,
  onSave,
  onCancel,
}: {
  quiz: Quiz
  onChange: (q: Quiz) => void
  onSave: () => void
  onCancel: () => void
}) {
  const update = (patch: Partial<Quiz>) => onChange({ ...quiz, ...patch })

  const updateQuestion = (qi: number, patch: Partial<Question>) => {
    const questions = quiz.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q))
    onChange({ ...quiz, questions })
  }

  const updateAnswer = (qi: number, ai: number, patch: Partial<Answer>) => {
    const q = quiz.questions[qi]
    let answers = q.answers.map((a, i) => (i === ai ? { ...a, ...patch } : a))
    if (patch.correct) {
      answers = answers.map((a, i) => ({ ...a, correct: i === ai }))
    }
    updateQuestion(qi, { answers })
  }

  const addAnswer = (qi: number) => {
    const q = quiz.questions[qi]
    if (q.answers.length >= 4) return
    updateQuestion(qi, {
      answers: [...q.answers, { text: '', correct: false }],
    })
  }

  const removeAnswer = (qi: number, ai: number) => {
    const q = quiz.questions[qi]
    if (q.answers.length <= 2) return
    const answers = q.answers.filter((_, i) => i !== ai)
    if (!answers.some((a) => a.correct)) answers[0].correct = true
    updateQuestion(qi, { answers })
  }

  const addQuestion = () => {
    onChange({
      ...quiz,
      questions: [
        ...quiz.questions,
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
    })
  }

  const removeQuestion = (qi: number) => {
    if (quiz.questions.length <= 1) return
    onChange({
      ...quiz,
      questions: quiz.questions.filter((_, i) => i !== qi),
    })
  }

  return (
    <div className="page editor">
      <header className="topbar">
        <button type="button" className="back" onClick={onCancel}>
          ← Vissza
        </button>
        <h1>Kvíz szerkesztése</h1>
      </header>

      <label className="field">
        <span>Cím</span>
        <input
          value={quiz.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Kvíz címe"
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={quiz.randomizeAnswers}
          onChange={(e) => update({ randomizeAnswers: e.target.checked })}
        />
        Válaszok sorrendjének keverése játék közben
      </label>

      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="question-edit">
          <div className="qe-header">
            <strong>Kérdés {qi + 1}</strong>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => removeQuestion(qi)}>
              Törlés
            </button>
          </div>
          <textarea
            value={q.text}
            onChange={(e) => updateQuestion(qi, { text: e.target.value })}
            placeholder="Kérdés szövege"
            rows={2}
          />
          <label className="field inline">
            <span>Időlimit (mp)</span>
            <input
              type="number"
              min={5}
              max={120}
              value={q.timeLimit}
              onChange={(e) =>
                updateQuestion(qi, { timeLimit: Math.max(5, Number(e.target.value) || 20) })
              }
            />
          </label>
          {q.answers.map((a, ai) => (
            <div key={ai} className="answer-edit">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={a.correct}
                onChange={() => updateAnswer(qi, ai, { correct: true })}
                title="Helyes válasz"
              />
              <input
                className="grow"
                value={a.text}
                onChange={(e) => updateAnswer(qi, ai, { text: e.target.value })}
                placeholder={`${ai + 1}. válasz`}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={q.answers.length <= 2}
                onClick={() => removeAnswer(qi, ai)}
              >
                ×
              </button>
            </div>
          ))}
          {q.answers.length < 4 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addAnswer(qi)}>
              + Válasz
            </button>
          )}
        </div>
      ))}

      <div className="toolbar sticky-bottom">
        <button type="button" className="btn btn-ghost" onClick={addQuestion}>
          + Kérdés
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave}>
          Mentés
        </button>
      </div>
    </div>
  )
}
