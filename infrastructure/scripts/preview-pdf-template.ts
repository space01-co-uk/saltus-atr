/**
 * Preview the PDF template locally by compiling it with mock data
 * and writing the output HTML to a file you can open in a browser.
 *
 * Usage: npx ts-node scripts/preview-pdf-template.ts [rating]
 *   e.g. npx ts-node scripts/preview-pdf-template.ts 5
 */
import * as fs from 'fs'
import * as path from 'path'
import { compileTemplate } from '../lambda/generatePDF/template'
import { questions } from '../lambda/generatePDF/data'
import { mediumRiskAnswers, highRiskAnswers, lowRiskAnswers } from '../lambda/generatePDF/__fixtures__/mockAnswers'

const rating = process.argv[2] || '3'

const answersForRating: Record<string, typeof mediumRiskAnswers> = {
  '1': lowRiskAnswers,
  '2': lowRiskAnswers,
  '3': mediumRiskAnswers,
  '4': highRiskAnswers,
  '5': highRiskAnswers,
}

const html = compileTemplate({
  RiskRating: rating,
  RiskQuestionsString: JSON.stringify(questions),
  RiskAnswersString: JSON.stringify(answersForRating[rating] ?? mediumRiskAnswers),
  date: new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
})

const outputPath = path.join(__dirname, 'preview-output.html')
fs.writeFileSync(outputPath, html)
console.log(`Preview written to: ${outputPath} (rating: ${rating})`)
console.log('Opening in browser...')

require('child_process').execSync(`open "${outputPath}"`)
