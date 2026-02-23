import type { Operation } from '@apollo/client'
import { mockQuestions, calculateMockRisk } from './mockData'

export function getDefinition(operation: Operation): Record<string, unknown> {
  const operationName = operation.operationName

  switch (operationName) {
    case 'GetQuestions':
      return { getQuestions: mockQuestions }

    case 'CalculateRisk': {
      const responses = operation.variables.responses as Array<{
        questionId: number
        responseId: number
      }>
      const rating = calculateMockRisk(responses)
      return { calculateRisk: { rating } }
    }

    case 'GenerateRiskResultPDF':
      // In mock mode, return a fake URL — PDF download won't work without real backend
      return {
        generateRiskResultPDF: {
          url: 'mock://pdf-not-available-in-dev-mode',
        },
      }

    default:
      console.warn(`[MockLink] Unknown operation: ${operationName}`)
      return {}
  }
}
