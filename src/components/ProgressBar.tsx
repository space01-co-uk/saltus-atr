interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="mb-6">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label="Question progress"
        className="flex gap-1"
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          let bgClass = 'bg-light-grey'
          if (step < currentStep) bgClass = 'bg-green'
          else if (step === currentStep) bgClass = 'bg-teal'

          return (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full ${bgClass}`}
            />
          )
        })}
      </div>
      <p className="mt-2 font-body text-sm text-grey">
        Question {currentStep} of {totalSteps}
      </p>
    </div>
  )
}
