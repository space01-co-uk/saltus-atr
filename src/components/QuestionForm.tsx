import { useForm } from 'react-hook-form'
import type { Question } from '../context/types'

interface QuestionFormProps {
  question: Question
  onSubmit: (responseId: number) => void
  isLastQuestion: boolean
}

interface FormValues {
  selectedAnswer: string
}

export function QuestionForm({ question, onSubmit, isLastQuestion }: QuestionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>()

  const onFormSubmit = (data: FormValues) => {
    onSubmit(Number(data.selectedAnswer))
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <fieldset>
        <legend className="mb-4 font-heading text-xl font-normal text-navy">
          {question.text}
        </legend>

        <div className="space-y-2">
          {question.answers.map((answer) => (
            <label
              key={answer.id}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-input border border-divider bg-white p-3 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/20 hover:border-grey"
            >
              <input
                type="radio"
                value={answer.id}
                {...register('selectedAnswer', {
                  required: 'Please select an answer',
                })}
                className="h-4 w-4 accent-teal"
              />
              <span className="font-body text-base text-navy">{answer.text}</span>
            </label>
          ))}
        </div>

        {errors.selectedAnswer && (
          <p className="mt-2 font-body text-sm text-coral" role="alert">
            {errors.selectedAnswer.message}
          </p>
        )}

        <button
          type="submit"
          className="mt-6 rounded-pill bg-navy px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-dark-navy"
        >
          {isLastQuestion ? 'Submit' : 'Next'}
        </button>
      </fieldset>
    </form>
  )
}
