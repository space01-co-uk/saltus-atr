import { describe, it, expect } from 'vitest'
import { compileTemplate } from './template'
import { questions } from './data'
import { mediumRiskAnswers, highRiskAnswers, lowRiskAnswers } from './__fixtures__/mockAnswers'

function renderTemplate(rating: string, answers = mediumRiskAnswers) {
  return compileTemplate({
    RiskRating: rating,
    RiskQuestionsString: JSON.stringify(questions),
    RiskAnswersString: JSON.stringify(answers),
    date: '24/02/2026',
  })
}

describe('compileTemplate', () => {
  it('returns valid HTML with doctype', () => {
    const html = renderTemplate('3')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('</html>')
  })

  it('includes the Roboto font stylesheet', () => {
    const html = renderTemplate('3')
    expect(html).toContain('fonts.googleapis.com/css2?family=Roboto')
  })

  it('embeds the Saltus logo SVG', () => {
    const html = renderTemplate('3')
    // Logo should appear in page headers and footers
    expect(html).toContain('viewBox="0 0 995 246"')
    // At least 3 pages × header + footer = 6 logo instances
    const logoCount = (html.match(/viewBox="0 0 995 246"/g) || []).length
    expect(logoCount).toBe(6)
  })

  it('includes the date', () => {
    const html = renderTemplate('3')
    expect(html).toContain('24/02/2026')
  })

  describe('risk labels and descriptions', () => {
    const cases: Array<{ rating: string; label: string; descSnippet: string }> = [
      { rating: '1', label: 'Lower Risk', descSnippet: 'more conservative' },
      { rating: '2', label: 'Lower-Medium Risk', descSnippet: 'relatively cautious' },
      { rating: '3', label: 'Medium Risk', descSnippet: 'balanced approach' },
      { rating: '4', label: 'Medium-Higher Risk', descSnippet: 'comfortable taking some investment risk' },
      { rating: '5', label: 'Higher Risk', descSnippet: 'very comfortable taking investment risk' },
    ]

    cases.forEach(({ rating, label, descSnippet }) => {
      it(`rating ${rating} shows "${label}" and correct description`, () => {
        const html = renderTemplate(rating)
        expect(html).toContain(label)
        expect(html).toContain(descSnippet)
      })
    })

    it('unknown rating defaults to "Unknown"', () => {
      const html = renderTemplate('9')
      expect(html).toContain('Unknown Risk')
    })
  })

  describe('risk scale bar', () => {
    it('rating 1 — first segment active, none below', () => {
      const html = renderTemplate('1')
      expect(html).toContain('scale-segment active')
      expect(html).not.toContain('scale-segment below')
    })

    it('rating 3 — two segments below, one active, two plain', () => {
      const html = renderTemplate('3')
      const belowCount = (html.match(/scale-segment below/g) || []).length
      const activeCount = (html.match(/scale-segment active/g) || []).length
      expect(belowCount).toBe(2)
      expect(activeCount).toBe(1)
    })

    it('rating 5 — four segments below, one active', () => {
      const html = renderTemplate('5')
      const belowCount = (html.match(/scale-segment below/g) || []).length
      const activeCount = (html.match(/scale-segment active/g) || []).length
      expect(belowCount).toBe(4)
      expect(activeCount).toBe(1)
    })

    it('always renders exactly 5 scale segments', () => {
      const html = renderTemplate('3')
      // Match the opening div tags — each class string contains "scale-segment"
      // plus optionally " below" or " active", so count distinct divs
      const segmentCount = (html.match(/class="scale-segment(?:\s(?:below|active))?"/g) || []).length
      expect(segmentCount).toBe(5)
    })
  })

  describe('rating circle', () => {
    it('displays the rating number', () => {
      const html = renderTemplate('4')
      expect(html).toContain('<span class="rating-number">4</span>')
    })

    it('displays "of 5" subtext', () => {
      const html = renderTemplate('3')
      expect(html).toContain('of 5')
    })
  })

  describe('questions and answers (client-side rendered)', () => {
    // Questions are rendered by a <script> block at runtime, not in the
    // static HTML. We test that the data is correctly embedded.

    it('embeds all question JSON data in the script block', () => {
      const html = renderTemplate('3')
      // The script parses the JSON — verify all 13 questions are present
      questions.forEach((q) => {
        expect(html).toContain(q.text)
      })
    })

    it('embeds answer JSON data in the script block', () => {
      const html = renderTemplate('3', mediumRiskAnswers)
      // Check the answers JSON is embedded (responseId values)
      mediumRiskAnswers.forEach((a) => {
        expect(html).toContain(`"questionId":${a.questionId}`)
        expect(html).toContain(`"responseId":${a.responseId}`)
      })
    })

    it('contains the buildQuestionHtml function', () => {
      const html = renderTemplate('3')
      // The JS function that generates question items at runtime
      expect(html).toContain('buildQuestionHtml')
      expect(html).toContain('question-number')
    })

    it('has empty question list containers for JS to populate', () => {
      const html = renderTemplate('3')
      expect(html).toContain('class="question-list first-section"')
      expect(html).toContain('class="question-list second-section"')
    })

    it('splits questions at id 7 boundary', () => {
      const html = renderTemplate('3')
      // The script splits at q.id <= 7 for first section
      expect(html).toContain('q.id <= 7')
    })
  })

  describe('page structure', () => {
    it('has 3 pages', () => {
      const pageCount = (renderTemplate('3').match(/class="page"/g) || []).length
      expect(pageCount).toBe(3)
    })

    it('page 1 has results title', () => {
      const html = renderTemplate('3')
      expect(html).toContain('Attitude to Risk')
    })

    it('pages 2 and 3 show question ranges', () => {
      const html = renderTemplate('3')
      expect(html).toContain('Questions 1')
      expect(html).toContain('7 of 13')
      expect(html).toContain('Questions 8')
      expect(html).toContain('13 of 13')
    })

    it('includes page numbers in footers', () => {
      const html = renderTemplate('3')
      expect(html).toContain('Page 2 of 3')
      expect(html).toContain('Page 3 of 3')
    })
  })

  describe('different answer sets', () => {
    it('renders with low-risk answers without errors', () => {
      expect(() => renderTemplate('1', lowRiskAnswers)).not.toThrow()
    })

    it('renders with high-risk answers without errors', () => {
      expect(() => renderTemplate('5', highRiskAnswers)).not.toThrow()
    })
  })
})
