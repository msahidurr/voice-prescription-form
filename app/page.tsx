"use client"

import { useState } from "react"
import { VoiceRecorder } from "@/components/voice-recorder"
import { PrescriptionForm } from "@/components/prescription-form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FileDown, Sparkles } from "lucide-react"
import { defaultPrescriptionData, type PrescriptionData } from "@/lib/prescription-types"
import { generatePrescriptionPDF } from "@/lib/generate-pdf"

export default function VoicePrescriptionPage() {
  const [transcript, setTranscript] = useState("")
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionData>(defaultPrescriptionData)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleTranscriptChange = (newTranscript: string) => {
    console.log("[v0] Transcript updated:", newTranscript)
    setTranscript(newTranscript)
  }

  const handleReset = () => {
    setTranscript("")
    setPrescriptionData(defaultPrescriptionData)
    setParseError(null)
  }

  const handleParseTranscript = async () => {
    if (!transcript.trim()) return

    setIsParsing(true)
    setParseError(null)

    try {
      const response = await fetch("/api/parse-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })

      if (!response.ok) {
        throw new Error("Failed to parse prescription")
      }

      const data = await response.json()
      console.log("[v0] API response:", data)
      const { prescription } = data

      if (!prescription) {
        throw new Error("No prescription data in response")
      }

      console.log("[v0] Parsed prescription:", prescription)

      // Merge parsed data with defaults
      setPrescriptionData((prev) => ({
        ...prev,
        patientName: prescription.patientName || prev.patientName,
        age: prescription.age || prev.age,
        sex: prescription.sex || prev.sex,
        vitals: {
          ...prev.vitals,
          height: prescription.vitals?.height || prev.vitals.height,
          weight: prescription.vitals?.weight || prev.vitals.weight,
          temperature: prescription.vitals?.temperature || prev.vitals.temperature,
          bloodPressure: prescription.vitals?.bloodPressure || prev.vitals.bloodPressure,
          pulse: prescription.vitals?.pulse || prev.vitals.pulse,
          spo2: prescription.vitals?.spo2 || prev.vitals.spo2,
        },
        chiefComplaints: prescription.chiefComplaints || [],
        chronicDiseases: prescription.chronicDiseases || [],
        allergies: prescription.allergies || [],
        investigations: prescription.investigations || [],
        diagnosis: prescription.diagnosis || [],
        medicines: prescription.medicines || [],
        advice: prescription.advice || [],
      }))
    } catch (error) {
      console.error("Parse error:", error)
      setParseError("Failed to parse the transcript. Please try again.")
    } finally {
      setIsParsing(false)
    }
  }

  const handleDownloadPDF = () => {
    generatePrescriptionPDF(prescriptionData)
  }

  const hasPrescriptionData =
    prescriptionData.chiefComplaints.length > 0 ||
    prescriptionData.medicines.length > 0 ||
    prescriptionData.diagnosis.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Voice Rx Generator</h1>
          <p className="text-muted-foreground text-sm">
            Speak your prescription and generate a professional PDF
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6" style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>
          {/* Left Column - Voice Recorder */}
          <VoiceRecorder
            transcript={transcript}
            onTranscriptChange={handleTranscriptChange}
            onReset={handleReset}
          />

          {/* Right Column - Prescription Form */}
          <PrescriptionForm
            data={prescriptionData}
            onDataChange={setPrescriptionData}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <Button
            onClick={handleParseTranscript}
            disabled={!transcript.trim() || isParsing}
            className="gap-2"
          >
            {isParsing ? (
              <>
                <Spinner className="h-4 w-4" />
                Parsing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Parse Transcript with AI
              </>
            )}
          </Button>

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            disabled={!hasPrescriptionData}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {parseError && (
          <p className="text-center text-destructive mt-4">{parseError}</p>
        )}
      </main>
    </div>
  )
}
