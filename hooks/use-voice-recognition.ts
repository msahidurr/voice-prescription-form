"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseVoiceRecognitionOptions {
  onTranscript?: (transcript: string) => void
  onFinalTranscript?: (transcript: string) => void
  continuous?: boolean
  interimResults?: boolean
  lang?: string
}

interface UseVoiceRecognitionReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  isSupported: boolean
  error: string | null
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const {
    onTranscript,
    onFinalTranscript,
    continuous = true,
    interimResults = true,
    lang = "en-US",
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isListeningRef = useRef(false)
  const transcriptRef = useRef("")

  // Keep refs in sync with state
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  // Store callbacks in refs to avoid recreation
  const onTranscriptRef = useRef(onTranscript)
  const onFinalTranscriptRef = useRef(onFinalTranscript)
  
  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onFinalTranscriptRef.current = onFinalTranscript
  }, [onTranscript, onFinalTranscript])

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    
    setIsSupported(!!SpeechRecognition)

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.lang = lang

    recognition.onresult = (event) => {
      console.log("[v0] Speech recognition result received", event.results.length)
      console.log("[v0] Event result index:", event.resultIndex)
      let finalText = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript + " "
          console.log("[v0] Final text:", result[0].transcript)
        } else {
          interimText += result[0].transcript
          console.log("[v0] Interim text:", result[0].transcript)
        }
      }

      if (finalText) {
        const newTranscript = transcriptRef.current + finalText
        console.log("[v0] Setting new transcript:", newTranscript)
        transcriptRef.current = newTranscript
        setTranscript(newTranscript)
        console.log("[v0] Calling onTranscript callback with:", newTranscript)
        onTranscriptRef.current?.(newTranscript)
        onFinalTranscriptRef.current?.(finalText.trim())
      }
      if (interimText) {
        console.log("[v0] Setting interim transcript:", interimText)
      }
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event) => {
      console.error("[v0] Speech recognition error:", event.error)
      setError(event.error)
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setIsListening(false)
        isListeningRef.current = false
      }
    }

    recognition.onstart = () => {
      console.log("[v0] Speech recognition started")
    }

    recognition.onend = () => {
      console.log("[v0] Speech recognition ended, isListening:", isListeningRef.current)
      // Only restart if we're still supposed to be listening
      if (isListeningRef.current && continuous) {
        try {
          console.log("[v0] Restarting speech recognition...")
          recognition.start()
        } catch (e) {
          console.error("[v0] Failed to restart recognition:", e)
          setIsListening(false)
          isListeningRef.current = false
        }
      } else {
        setIsListening(false)
        isListeningRef.current = false
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [continuous, interimResults, lang])

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition && !isListeningRef.current) {
      setError(null)
      try {
        console.log("[v0] Starting speech recognition...")
        recognition.start()
        setIsListening(true)
        isListeningRef.current = true
      } catch (e) {
        console.error("[v0] Failed to start recognition:", e)
        setError("Failed to start speech recognition")
      }
    }
  }, [])

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition && isListeningRef.current) {
      console.log("[v0] Stopping speech recognition...")
      isListeningRef.current = false
      setIsListening(false)
      recognition.stop()
      setInterimTranscript("")
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    transcriptRef.current = ""
    setInterimTranscript("")
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  }
}

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
