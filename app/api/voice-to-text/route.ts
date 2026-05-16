/**
 * Voice-to-Text API Endpoint
 * Converts audio (file upload or stream) to text using Whisper API
 * Requires X-API-Key header for authentication
 */

import { validateApiKey, createApiKeyErrorResponse } from '@/lib/auth/api-key-middleware'
import {
  validateAudioFile,
  audioFileToBuffer,
  AudioStreamAccumulator,
  getFileExtension,
  MAX_AUDIO_FILE_SIZE,
} from '@/lib/audio/audio-processor'

interface TranscriptionResponse {
  transcript: string
}

/**
 * Handle file upload: POST with multipart/form-data
 */
export async function POST(req: Request) {
  try {
    // Validate API key
    const auth = validateApiKey(req)
    if (!auth.valid) {
      return createApiKeyErrorResponse(auth.error || 'Invalid API key')
    }

    const contentType = req.headers.get('content-type') || ''

    // Route to appropriate handler based on content type
    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(req)
    } else if (contentType.includes('application/octet-stream')) {
      return handleAudioStream(req)
    } else if (contentType.includes('application/json')) {
      return handleJsonRequest(req)
    } else {
      return Response.json(
        { error: 'Invalid content type. Use multipart/form-data for file upload or application/octet-stream for audio stream.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[v0] Voice-to-text error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle file upload from multipart form data
 */
async function handleFileUpload(req: Request): Promise<Response> {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile || !(audioFile instanceof File)) {
      return Response.json(
        { error: 'No audio file provided. Please upload a file with field name "audio".' },
        { status: 400 }
      )
    }

    // Validate audio file
    const validation = validateAudioFile(audioFile)
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer and transcribe
    const audioBuffer = await audioFileToBuffer(audioFile)
    const transcript = await transcribeAudio(audioBuffer, validation.mimeType || 'audio/mpeg')

    return Response.json({
      transcript,
    } as TranscriptionResponse)
  } catch (error) {
    console.error('[v0] File upload error:', error)
    return Response.json(
      { error: 'Failed to process audio file' },
      { status: 500 }
    )
  }
}

/**
 * Handle audio stream: POST with application/octet-stream
 * Client sends raw audio bytes in request body
 */
async function handleAudioStream(req: Request): Promise<Response> {
  try {
    const accumulator = new AudioStreamAccumulator()

    // Read the request body as stream
    if (!req.body) {
      return Response.json(
        { error: 'No audio stream provided' },
        { status: 400 }
      )
    }

    const reader = req.body.getReader()
    let totalSize = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Add chunk to accumulator
      const result = accumulator.addChunk(value)
      if (!result.valid) {
        return Response.json(
          { error: result.error },
          { status: 413 } // Payload Too Large
        )
      }

      totalSize += value.length
    }

    if (totalSize === 0) {
      return Response.json(
        { error: 'No audio data received' },
        { status: 400 }
      )
    }

    // Get accumulated audio buffer
    const audioBuffer = accumulator.getBuffer()
    const transcript = await transcribeAudio(audioBuffer, 'audio/mpeg')

    return Response.json({
      transcript,
    } as TranscriptionResponse)
  } catch (error) {
    console.error('[v0] Stream error:', error)
    return Response.json(
      { error: 'Failed to process audio stream' },
      { status: 500 }
    )
  }
}

/**
 * Handle JSON request with base64 encoded audio
 * POST with application/json containing { audio: "base64string" }
 */
async function handleJsonRequest(req: Request): Promise<Response> {
  try {
    const { audio } = await req.json()

    if (!audio || typeof audio !== 'string') {
      return Response.json(
        { error: 'Invalid request. Please provide base64 encoded audio in "audio" field.' },
        { status: 400 }
      )
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, 'base64')

    if (audioBuffer.length === 0) {
      return Response.json(
        { error: 'Audio data is empty' },
        { status: 400 }
      )
    }

    if (audioBuffer.length > MAX_AUDIO_FILE_SIZE) {
      return Response.json(
        { error: `Audio exceeds maximum size of ${MAX_AUDIO_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    const transcript = await transcribeAudio(audioBuffer, 'audio/mpeg')

    return Response.json({
      transcript,
    } as TranscriptionResponse)
  } catch (error) {
    console.error('[v0] JSON request error:', error)
    return Response.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}

/**
 * Transcribe audio using OpenAI Whisper API via Azure
 */
async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
  const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    throw new Error('Azure OpenAI credentials not configured')
  }

  // Create FormData for Whisper API
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), `audio.${getFileExtension(mimeType)}`)
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const apiUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/whisper-1/audio/transcriptions?api-version=2024-02-15-preview`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'api-key': AZURE_OPENAI_KEY,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('[v0] Whisper API error:', errorData)
    throw new Error(`Whisper API error: ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.text) {
    throw new Error('No transcript returned from Whisper API')
  }

  return result.text
}
