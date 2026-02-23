import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionForm } from './QuestionForm'
import type { Question } from '../context/types'

const mockQuestion: Question = {
  id: '1',
  text: 'How adventurous are you?',
  answers: [
    { id: '1', text: 'Very adventurous' },
    { id: '2', text: 'Somewhat adventurous' },
    { id: '3', text: 'Not at all' },
  ],
}

describe('QuestionForm', () => {
  it('renders question text in legend', () => {
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={false} />,
    )
    expect(screen.getByText('How adventurous are you?')).toBeInTheDocument()
  })

  it('renders all answer options as radio buttons', () => {
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={false} />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByText('Very adventurous')).toBeInTheDocument()
    expect(screen.getByText('Somewhat adventurous')).toBeInTheDocument()
    expect(screen.getByText('Not at all')).toBeInTheDocument()
  })

  it('shows validation error when submitting without selection', async () => {
    const user = userEvent.setup()
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={false} />,
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please select an answer')
  })

  it('calls onSubmit with correct responseId when answer selected', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <QuestionForm question={mockQuestion} onSubmit={onSubmit} isLastQuestion={false} />,
    )
    await user.click(screen.getByLabelText('Somewhat adventurous'))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onSubmit).toHaveBeenCalledWith(2)
  })

  it('button says "Next" when isLastQuestion is false', () => {
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={false} />,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('button says "Submit" when isLastQuestion is true', () => {
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={true} />,
    )
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('resets form after submission', async () => {
    const user = userEvent.setup()
    render(
      <QuestionForm question={mockQuestion} onSubmit={vi.fn()} isLastQuestion={false} />,
    )
    const radio = screen.getByLabelText('Very adventurous') as HTMLInputElement
    await user.click(radio)
    expect(radio.checked).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    // After submission, radio should be unchecked (form reset)
    expect(radio.checked).toBe(false)
  })
})
