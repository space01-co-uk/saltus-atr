import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('renders the correct number of segments', () => {
    const { container } = render(<ProgressBar currentStep={3} totalSteps={13} />)
    const segments = container.querySelectorAll('[role="progressbar"] > div')
    expect(segments).toHaveLength(13)
  })

  it('shows completed segments with green styling', () => {
    const { container } = render(<ProgressBar currentStep={5} totalSteps={13} />)
    const segments = container.querySelectorAll('[role="progressbar"] > div')
    // Steps 1-4 should be green (completed)
    for (let i = 0; i < 4; i++) {
      expect(segments[i]).toHaveClass('bg-green')
    }
  })

  it('shows current segment with teal styling', () => {
    const { container } = render(<ProgressBar currentStep={5} totalSteps={13} />)
    const segments = container.querySelectorAll('[role="progressbar"] > div')
    expect(segments[4]).toHaveClass('bg-teal')
  })

  it('shows future segments with grey styling', () => {
    const { container } = render(<ProgressBar currentStep={5} totalSteps={13} />)
    const segments = container.querySelectorAll('[role="progressbar"] > div')
    for (let i = 5; i < 13; i++) {
      expect(segments[i]).toHaveClass('bg-light-grey')
    }
  })

  it('has correct ARIA attributes', () => {
    render(<ProgressBar currentStep={7} totalSteps={13} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuemin', '1')
    expect(progressbar).toHaveAttribute('aria-valuemax', '13')
    expect(progressbar).toHaveAttribute('aria-valuenow', '7')
    expect(progressbar).toHaveAttribute('aria-label', 'Question progress')
  })

  it('displays "Question N of M" label text', () => {
    render(<ProgressBar currentStep={3} totalSteps={13} />)
    expect(screen.getByText('Question 3 of 13')).toBeInTheDocument()
  })
})
