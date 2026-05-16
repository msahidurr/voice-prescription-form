/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against PRESCRIPTION_API_KEY environment variable
 */

export function validateApiKey(request: Request): { valid: boolean; error?: string } {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key')

  if (!apiKey) {
    return {
      valid: false,
      error: 'API key missing. Please provide X-API-Key header.',
    }
  }

  const expectedKey = process.env.PRESCRIPTION_API_KEY

  if (!expectedKey) {
    console.error('[v0] PRESCRIPTION_API_KEY environment variable is not configured')
    return {
      valid: false,
      error: 'API configuration error',
    }
  }

  if (apiKey !== expectedKey) {
    return {
      valid: false,
      error: 'Invalid API key',
    }
  }

  return { valid: true }
}

export function createApiKeyErrorResponse(error: string) {
  return Response.json(
    { error },
    { status: 401 }
  )
}
