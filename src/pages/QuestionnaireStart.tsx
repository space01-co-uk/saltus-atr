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
    <div className="w-full max-w-xl rounded-card bg-panel p-8 shadow-card sm:p-10">
      {/* Title */}
      <div className="mb-7 text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Attitude to Risk
        </h1>
        <h2 className="font-heading text-3xl font-bold text-coral">
          Questionnaire
        </h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-muted-fg">
          Check how much risk you might be comfortable taking with your
          investments with our risk profiler designed by EV, leading experts in
          the field of risk analysis.
        </p>
      </div>

      {/* Info badges */}
      <div className="mb-7 flex flex-wrap justify-center gap-3">
        <span className="flex items-center gap-1.5 rounded-pill bg-muted px-3 py-1.5 font-body text-xs font-medium text-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6m-3 7 2 2 4-4" /></svg>
          13 questions
        </span>
        <span className="flex items-center gap-1.5 rounded-pill bg-muted px-3 py-1.5 font-body text-xs font-medium text-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          &lt; 5 minutes
        </span>
        <span className="flex items-center gap-1.5 rounded-pill bg-muted px-3 py-1.5 font-body text-xs font-medium text-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          Private
        </span>
      </div>

      {/* Divider */}
      <hr className="mb-7 border-border-clr" />

      {/* Intro text */}
      <div className="mb-7 space-y-4">
        <p className="font-body text-sm leading-relaxed text-foreground">
          Choosing to invest, rather than saving alone, gives your money more
          chance to potentially grow. How much risk you take can affect your
          potential growth so it&apos;s important to understand how much
          you&apos;re willing and able to take.
        </p>
        <p className="font-body text-sm leading-relaxed text-foreground">
          Our profiler helps you understand your attitude towards risk. It asks
          several key investment-related questions designed to assess your
          experience with different types of investments and your comfort level
          with taking risks.
        </p>
        <p className="font-body text-sm leading-relaxed text-foreground">
          Each response is assigned a score, which is then combined to provide
          you with an overall risk rating &mdash; there are five levels of risk
          ratings.
        </p>
      </div>

      {/* Divider */}
      <hr className="mb-7 border-border-clr" />

      {/* Risk ratings section */}
      <div className="mb-7">
        <h3 className="mb-5 font-heading text-xl font-bold text-foreground">
          What are the risk ratings?
        </h3>
        <RiskLevelSelector />
      </div>

      {/* Divider */}
      <hr className="mb-7 border-border-clr" />

      {/* How to assess */}
      <div className="mb-7">
        <h3 className="mb-4 font-heading text-xl font-bold text-foreground">
          How to assess your attitude to risk
        </h3>
        <p className="mb-4 font-body text-sm leading-relaxed text-foreground">
          This EV questionnaire can help you understand your attitude to risk
          but there are some limitations:
        </p>
        <ul className="space-y-3">
          <li className="flex gap-2 font-body text-sm leading-relaxed text-foreground">
            <span className="font-bold text-coral">&#8226;</span>
            <span>
              The questionnaire is designed to help you decide for yourself and
              shouldn&apos;t be taken as advice
            </span>
          </li>
          <li className="flex gap-2 font-body text-sm leading-relaxed text-foreground">
            <span className="font-bold text-coral">&#8226;</span>
            <span>
              The questionnaire doesn&apos;t consider your age, your financial
              goals or how much money you&apos;d be comfortable losing i.e. your
              capacity for loss
            </span>
          </li>
          <li className="flex gap-2 font-body text-sm leading-relaxed text-foreground">
            <span className="font-bold text-coral">&#8226;</span>
            <span>
              You should also consider how long you plan to invest for and when
              you think you might need access to your money
            </span>
          </li>
        </ul>
      </div>

      {/* Divider */}
      <hr className="mb-7 border-border-clr" />

      {/* Take the questionnaire */}
      <div className="text-center">
        <h3 className="mb-4 font-heading text-xl font-bold text-foreground">
          Take the questionnaire
        </h3>
        <p className="mb-6 font-body text-sm leading-relaxed text-foreground">
          The EV attitude to risk questionnaire contains 13 multiple choice
          questions which you need to answer to discover your risk rating. It
          should take less than 5 minutes.
        </p>
        <button
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-coral px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-coral/90"
        >
          I&apos;m ready to start
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
