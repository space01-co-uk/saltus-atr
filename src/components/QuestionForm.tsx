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
        <legend className="mb-4 font-heading text-xl font-normal text-foreground">
          {question.text}
        </legend>

        <div className="space-y-2">
          {question.answers.map((answer) => (
            <label
              key={answer.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input border border-border-clr bg-panel p-3 transition-colors has-checked:border-coral has-checked:bg-coral/10 hover:border-muted-fg"
            >
              <input
                type="radio"
                value={answer.id}
                {...register('selectedAnswer', {
                  required: 'Please select an answer',
                })}
                className="h-4 w-4 accent-coral"
              />
              <span className="font-body text-base text-foreground">{answer.text}</span>
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
          className="mt-6 rounded-pill bg-coral px-8 py-3 font-body text-base font-medium text-white transition-colors hover:bg-coral/90"
        >
          {isLastQuestion ? 'Submit' : 'Next'}
        </button>
      </fieldset>
    </form>
  )
}
