import { useNavigate } from 'react-router-dom'
import { useQuestionnaire } from '../context/QuestionnaireContext'
import { RiskLevelSelector } from '../components/RiskLevelSelector'

export default function QuestionnaireStart() {
  const navigate = useNavigate()
  const { dispatch } = useQuestionnaire()

  const handleStart = () => {
    dispatch({ type: 'RESET_FORM' })
    navigate('/questionnaire')
  }

  return (
    <div>
      <h2 className="mb-4 font-heading text-2xl text-navy">
        Check your attitude to risk
      </h2>

      <p className="mb-6 font-body text-base text-grey">
        Understanding your attitude to risk is an important part of financial planning.
        This questionnaire will help determine how comfortable you are with investment
        risk, so your adviser can recommend an appropriate investment strategy.
      </p>

      <RiskLevelSelector />

      <p className="mt-6 font-body text-sm text-grey">
        Please note: this questionnaire assesses your attitude to risk only. It does not
        consider your age, financial goals, or capacity for loss. Your financial adviser
        will take these into account when making recommendations.
      </p>

      <h2 className="mb-4 mt-10 font-heading text-2xl text-navy">
        Take the questionnaire
      </h2>

      <p className="mb-4 font-body text-base text-grey">
        13 multiple choice questions, less than 5 minutes.
      </p>

      <div className="mb-6 rounded-card bg-teal/20 p-4">
        <p className="font-body text-sm font-medium text-navy">
          We don&apos;t store your data
        </p>
        <p className="mt-1 font-body text-sm text-navy">
          Your answers are processed anonymously and are not saved after your session ends.
        </p>
      </div>

      <button
        onClick={handleStart}
        className="rounded-pill bg-navy px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-dark-navy"
      >
        I&apos;m ready to start
      </button>
    </div>
  )
}
