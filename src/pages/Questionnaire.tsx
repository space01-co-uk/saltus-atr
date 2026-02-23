import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { useQuestionnaire } from '../context/QuestionnaireContext'
import { GET_QUESTIONS } from '../graphql/queries'
import { ProgressBar } from '../components/ProgressBar'
import { QuestionForm } from '../components/QuestionForm'
import type { Question } from '../context/types'

interface GetQuestionsData {
  getQuestions: Question[]
}

export default function Questionnaire() {
  const navigate = useNavigate()
  const { state, dispatch } = useQuestionnaire()
  const { loading, error, data } = useQuery<GetQuestionsData>(GET_QUESTIONS, { fetchPolicy: 'no-cache' })

  useEffect(() => {
    if (data?.getQuestions) {
      dispatch({ type: 'SET_QUESTIONS', payload: data.getQuestions })
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      navigate('/error')
    }
  }, [error, navigate])

  useEffect(() => {
    if (
      state.questions.length > 0 &&
      state.answers.length === state.questions.length
    ) {
      navigate('/results')
    }
  }, [state.answers.length, state.questions.length, navigate])

  if (loading || state.questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-light-grey border-t-teal" />
      </div>
    )
  }

  const currentQuestion = state.questions[state.currentQuestion - 1]
  if (!currentQuestion) return null

  const handleSubmit = (responseId: number) => {
    dispatch({
      type: 'UPDATE_ANSWERS',
      payload: { questionId: state.currentQuestion, responseId },
    })
    dispatch({
      type: 'SET_CURRENT_QUESTION',
      payload: Math.min(state.currentQuestion + 1, state.questions.length),
    })
  }

  return (
    <div>
      <h2 className="mb-6 font-heading text-2xl text-navy">
        Your attitude to risk
      </h2>

      <ProgressBar
        currentStep={state.currentQuestion}
        totalSteps={state.questions.length}
      />

      <QuestionForm
        key={state.currentQuestion}
        question={currentQuestion}
        onSubmit={handleSubmit}
        isLastQuestion={state.currentQuestion === state.questions.length}
      />
    </div>
  )
}
