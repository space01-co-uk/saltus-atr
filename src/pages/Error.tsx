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
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-coral/20">
        <span className="text-3xl text-coral" aria-hidden="true">!</span>
      </div>

      <h2 className="mb-4 font-heading text-2xl text-navy">Something went wrong</h2>

      <p className="mb-8 font-body text-base text-grey">
        Apologies we&apos;re experiencing some technical issues. Please try again later.
      </p>

      <button
        onClick={handleBack}
        className="rounded-pill bg-navy px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-dark-navy"
      >
        Back
      </button>
    </div>
  )
}
