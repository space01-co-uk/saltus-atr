import { randomUUID } from 'crypto'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { questions } from './data'
import { compileTemplate } from './template'
import { storeTemplate, storeDocument, getDocumentUrl } from './s3Service'

interface RiskAnswer {
  questionId: number
  responseId: number
}

interface AppSyncEvent {
  arguments: {
    input: {
      RiskRating: string
      RiskAnswers: RiskAnswer[]
    }
  }
}

function htmlEncode(str: string): string {
  return str.replace(/'/g, '&#39;').replace(/"/g, '\\"')
}

export const handler = async (event: AppSyncEvent) => {
  const bucket = process.env.PDF_BUCKET_NAME
  if (!bucket) throw new Error('PDF_BUCKET_NAME not set')

  try {
    const uuid = randomUUID()
    const { RiskRating, RiskAnswers } = event.arguments.input

    // Serialise questions and answers to JSON strings
    const questionsJson = JSON.stringify(questions)
    const answersJson = JSON.stringify(RiskAnswers)

    // HTML-encode the JSON strings for safe embedding in template
    const RiskQuestionsString = htmlEncode(questionsJson)
    const RiskAnswersString = htmlEncode(answersJson)

    // Format date as dd/mm/yyyy
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    // Compile HTML template
    const html = compileTemplate({
      RiskRating,
      RiskQuestionsString,
      RiskAnswersString,
      date,
    })

    // Store debug HTML in S3
    await storeTemplate(bucket, `${uuid}_debug.html`, html)

    // Launch headless Chromium and generate PDF
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: true,
    })

    await browser.close()

    // Store PDF in S3
    const pdfFilename = `${uuid}.pdf`
    await storeDocument(bucket, pdfFilename, Buffer.from(pdfBuffer))

    // Generate presigned URL
    const url = await getDocumentUrl(bucket, pdfFilename)

    return { url }
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Unable to generate PDF. Please try again later.')
  }
}
