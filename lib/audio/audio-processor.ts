/**
 * Audio Processing Utilities
 * Handles audio file validation, streaming, and format detection
 */

export const SUPPORTED_AUDIO_FORMATS = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024 // 25 MB (Whisper API limit)
export const MAX_STREAM_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
export const STREAM_TIMEOUT = 30 * 1000 // 30 seconds of inactivity

export interface AudioValidationResult {
  valid: boolean
  error?: string
  mimeType?: string
  size?: number
}

/**
 * Validate audio file from multipart form data
 */
export function validateAudioFile(
  file: File
): AudioValidationResult {
  if (!file) {
    return { valid: false, error: 'No audio file provided' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Audio file is empty' }
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return {
      valid: false,
      error: `Audio file exceeds maximum size of ${MAX_AUDIO_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  const mimeType = file.type || 'application/octet-stream'
  
  if (!isValidAudioMimeType(mimeType)) {
    return {
      valid: false,
      error: `Unsupported audio format: ${mimeType}. Supported formats: MP3, MP4, WAV, WebM`,
    }
  }

  return {
    valid: true,
    mimeType,
    size: file.size,
  }
}

/**
 * Check if MIME type is a supported audio format
 */
export function isValidAudioMimeType(mimeType: string): boolean {
  // Allow common variations
  const normalizedType = mimeType.toLowerCase()
  
  return (
    normalizedType.includes('audio') ||
    normalizedType === 'application/octet-stream' ||
    SUPPORTED_AUDIO_FORMATS.some(format => normalizedType.includes(format.split('/')[1]))
  )
}

/**
 * Convert audio file to buffer for API submission
 */
export async function audioFileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Accumulate streamed audio chunks
 */
export class AudioStreamAccumulator {
  private chunks: Uint8Array[] = []
  private totalSize = 0
  private startTime = Date.now()
  private lastChunkTime = Date.now()

  addChunk(chunk: Uint8Array): { valid: boolean; error?: string } {
    const now = Date.now()
    
    // Check for timeout (30 seconds of inactivity)
    if (now - this.lastChunkTime > STREAM_TIMEOUT) {
      return { valid: false, error: 'Stream timeout: no data received for 30 seconds' }
    }

    this.lastChunkTime = now

    // Check total duration
    if (now - this.startTime > MAX_STREAM_DURATION) {
      return { valid: false, error: 'Stream duration exceeded 5 minutes' }
    }

    // Check total size
    if (this.totalSize + chunk.length > MAX_AUDIO_FILE_SIZE) {
      return { valid: false, error: 'Stream size exceeded 25MB' }
    }

    this.chunks.push(chunk)
    this.totalSize += chunk.length

    return { valid: true }
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.chunks)
  }

  getSize(): number {
    return this.totalSize
  }

  getDuration(): number {
    return Date.now() - this.startTime
  }
}

/**
 * Get appropriate file extension from MIME type
 */
export function getFileExtension(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
  }

  return typeMap[mimeType] || 'audio'
}
