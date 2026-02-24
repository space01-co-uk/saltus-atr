import { useNavigate } from 'react-router-dom'
import { useQuestionnaire } from '../context/QuestionnaireContext'

export default function ErrorPage() {
  const navigate = useNavigate()
  const { dispatch } = useQuestionnaire()

  const handleBack = () => {
    dispatch({ type: 'RESET_FORM' })
    dispatch({ type: 'SET_QUESTIONS', payload: [] })
    navigate('/')
  }

  return (
    <div className="w-full max-w-lg rounded-card bg-panel p-8 text-center shadow-card sm:p-10">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20">
        <span className="text-3xl text-coral" aria-hidden="true">!</span>
      </div>

      <h2 className="mb-4 font-heading text-2xl text-foreground">Something went wrong</h2>

      <p className="mb-8 font-body text-base text-muted-fg">
        Apologies we&apos;re experiencing some technical issues. Please try again later.
      </p>

      <button
        onClick={handleBack}
        className="rounded-pill bg-coral px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-coral/90"
      >
        Back
      </button>
    </div>
  )
}
