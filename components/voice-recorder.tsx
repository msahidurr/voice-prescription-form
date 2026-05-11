"use client"

import { useState, useEffect } from "react"
import { useVoiceRecognition } from "@/hooks/use-voice-recognition"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void
  transcript: string
  onReset: () => void
}

export function VoiceRecorder({
  onTranscriptChange,
  transcript,
  onReset,
}: VoiceRecorderProps) {
  const [permissionStatus, setPermissionStatus] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown")

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error,
  } = useVoiceRecognition({
    onTranscript: onTranscriptChange,
    continuous: true,
    interimResults: true,
    lang: "en-US",
  })

  // Check microphone permission status
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((result) => {
          setPermissionStatus(result.state as "prompt" | "granted" | "denied")
          result.onchange = () => {
            setPermissionStatus(result.state as "prompt" | "granted" | "denied")
          }
        })
        .catch(() => {
          setPermissionStatus("unknown")
        })
    }
  }, [])

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening()
    } else {
      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setPermissionStatus("granted")
        console.log("[v0] Starting voice recognition...")
        startListening()
      } catch (err) {
        console.error("[v0] Microphone permission denied:", err)
        setPermissionStatus("denied")
      }
    }
  }

  if (!isSupported) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Voice Recording</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Speech recognition is not supported in your browser. Please use
            Chrome, Edge, or Safari.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Live Transcript</CardTitle>
        <span
          className={cn(
            "text-sm font-medium px-2 py-1 rounded-full",
            isListening 
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isListening ? "Recording" : "Idle"}
        </span>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex-1 min-h-[200px] p-4 bg-muted/50 rounded-lg border overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-muted-foreground italic">
                {interimTranscript}
              </span>
            )}
            {!transcript && !interimTranscript && (
              <span className="text-muted-foreground">
                Click the microphone button and start speaking to see the transcript here...
              </span>
            )}
          </p>
        </div>

        {error && error !== "no-speech" && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Error: {error}</span>
          </div>
        )}

        {permissionStatus === "denied" && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Microphone access denied. Please enable microphone access in your browser settings.</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={handleToggleListening}
            className={cn(
              "rounded-full h-16 w-16 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2",
              isListening
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse shadow-lg shadow-red-500/30"
                : "bg-primary hover:bg-primary/90 focus:ring-primary"
            )}
            aria-label={isListening ? "Stop recording" : "Start recording"}
          >
            {isListening ? (
              <MicOff className="h-6 w-6 text-white" />
            ) : (
              <Mic className="h-6 w-6 text-white" />
            )}
          </button>
          <span className="text-sm text-muted-foreground">
            Click to {isListening ? "Stop" : "Start"} Listening
          </span>
          
          {transcript && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Transcript
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
