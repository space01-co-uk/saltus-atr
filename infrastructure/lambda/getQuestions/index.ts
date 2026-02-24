interface AppSyncPipelineEvent {
  prev: {
    result: {
      access_token: string
    }
  }
}

interface EValueQuestion {
  questionId: number
  questionText: string
  responses: Array<{
    responseId: number
    responseText: string
  }>
}

export const handler = async (event: AppSyncPipelineEvent) => {
  const accessToken = event.prev?.result?.access_token
  if (!accessToken) {
    throw new Error('Missing EValue access token')
  }

  const baseUrl = process.env.EVALUE_API_BASE_URL
  if (!baseUrl) {
    throw new Error('EVALUE_API_BASE_URL environment variable is not set')
  }

  const response = await fetch(
    `${baseUrl}/riskQuestionnaire/1.0.0/riskProfiler/getQuestionnaireData`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questionnaireName: '5risk' }),
    }
  )

  if (!response.ok) {
    const body = await response.text()
    console.error(
      `EValue getQuestionnaireData failed: status=${response.status}, body=${body}`
    )
    throw new Error('Failed to fetch questions from EValue')
  }

  const data = (await response.json()) as EValueQuestion[]

  return data.map((q) => ({
    id: String(q.questionId),
    text: q.questionText,
    answers: q.responses.map((r) => ({
      id: String(r.responseId),
      text: r.responseText,
    })),
  }))
}
