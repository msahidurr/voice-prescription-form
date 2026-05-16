/**
 * Text-to-JSON API Endpoint
 * Converts prescription text/transcript to structured prescription JSON
 * Requires X-API-Key header for authentication
 */

import { validateApiKey, createApiKeyErrorResponse } from '@/lib/auth/api-key-middleware'
import { parseTextToPrescription, normalizePrescription } from '@/lib/parsing/prescription-parser'
import { PrescriptionData } from '@/lib/prescription-types'

const MAX_TEXT_LENGTH = 2000
const MIN_TEXT_LENGTH = 10

interface TextToJsonRequest {
  text: string
}

interface TextToJsonResponse {
  prescription: Partial<PrescriptionData>
}

interface ErrorResponse {
  error: string
}

/**
 * POST /api/text-to-json
 * Convert prescription text to structured JSON
 *
 * Request body:
 * {
 *   "text": "prescription transcript or description"
 * }
 *
 * Response:
 * {
 *   "prescription": { ... PrescriptionData ... }
 * }
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // Validate API key
    const auth = validateApiKey(req)
    if (!auth.valid) {
      return createApiKeyErrorResponse(auth.error || 'Invalid API key')
    }

    // Parse request body
    let body: TextToJsonRequest
    try {
      body = await req.json()
    } catch (error) {
      return Response.json(
        { error: 'Invalid JSON in request body' } as ErrorResponse,
        { status: 400 }
      )
    }

    // Validate text field
    if (!body.text) {
      return Response.json(
        { error: 'Missing required field: "text"' } as ErrorResponse,
        { status: 400 }
      )
    }

    const text = body.text.trim()

    // Validate text length
    if (text.length < MIN_TEXT_LENGTH) {
      return Response.json(
        { error: `Text must be at least ${MIN_TEXT_LENGTH} characters` } as ErrorResponse,
        { status: 422 }
      )
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return Response.json(
        { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` } as ErrorResponse,
        { status: 422 }
      )
    }

    // Parse text to prescription using LLM
    const result = await parseTextToPrescription(text)

    if (!result.success) {
      return Response.json(
        { error: result.error || 'Failed to parse prescription' } as ErrorResponse,
        { status: 422 }
      )
    }

    // Normalize and validate prescription data
    const normalizedPrescription = normalizePrescription(result.prescription || {})

    return Response.json({
      prescription: normalizedPrescription,
    } as TextToJsonResponse)
  } catch (error) {
    console.error('[v0] Text-to-JSON error:', error)
    return Response.json(
      { error: 'Internal server error' } as ErrorResponse,
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
