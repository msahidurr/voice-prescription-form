import { generateText, Output } from "ai"
import { z } from "zod"

const medicineSchema = z.object({
  name: z.string().describe("Medicine name with strength/dosage form"),
  dosage: z.string().describe("Dosage amount"),
  frequency: z.string().describe("How often to take, e.g., 1+0+1, 1+1+1"),
  duration: z.string().describe("Duration, e.g., 3 days, 5 days, 1 week"),
  instructions: z.string().nullable().describe("Special instructions like 'after meal', 'before sleep'"),
})

const vitalsSchema = z.object({
  height: z.string().nullable(),
  weight: z.string().nullable(),
  temperature: z.string().nullable(),
  bloodPressure: z.string().nullable(),
  pulse: z.string().nullable(),
  spo2: z.string().nullable(),
})

const prescriptionSchema = z.object({
  patientName: z.string().nullable().describe("Patient name if mentioned"),
  age: z.string().nullable().describe("Patient age if mentioned"),
  sex: z.string().nullable().describe("Patient sex/gender if mentioned"),
  vitals: vitalsSchema.describe("Vital signs if mentioned"),
  chiefComplaints: z.array(z.string()).describe("Chief complaints or symptoms"),
  chronicDiseases: z.array(z.string()).describe("Chronic diseases mentioned"),
  allergies: z.array(z.string()).describe("Allergies mentioned"),
  investigations: z.array(z.string()).describe("Investigations or tests recommended"),
  diagnosis: z.array(z.string()).describe("Diagnosis made"),
  medicines: z.array(medicineSchema).describe("Medicines prescribed with dosage details"),
  advice: z.array(z.string()).describe("Advice or instructions given"),
})

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json()
    console.log("[v0] Received transcript:", transcript)

    if (!transcript || transcript.trim() === "") {
      return Response.json({ error: "No transcript provided" }, { status: 400 })
    }

    console.log("[v0] Calling AI to parse prescription...")
    const { output } = await generateText({
      model: "anthropic/claude-opus-4.6",
      output: Output.object({
        schema: prescriptionSchema,
      }),
      messages: [
        {
          role: "system",
          content: `You are a medical prescription parser. Extract structured prescription data from the doctor's voice transcript.
          
Parse the following information:
- Patient details (name, age, sex)
- Vital signs (height, weight, temperature, blood pressure, pulse, SpO2)
- Chief complaints with duration
- Chronic diseases
- Allergies
- Investigations/tests
- Diagnosis
- Medicines with full details (name, dosage, frequency like "1+0+1", duration like "3 days", instructions)
- Advice

Common medicine patterns:
- "Napa 500" = Paracetamol 500mg tablet
- "1+1+1" = morning + afternoon + night
- "1+0+1" = morning + night only
- "SOS" = when needed

Be thorough and extract all mentioned information. If something is not mentioned, use empty arrays or null values.`,
        },
        {
          role: "user",
          content: `Parse this doctor's voice transcript into a structured prescription:\n\n${transcript}`,
        },
      ],
    })

    console.log("[v0] Parsed output:", JSON.stringify(output, null, 2))
    return Response.json({ prescription: output })
  } catch (error) {
    console.error("Error parsing prescription:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error details:", errorMessage)
    return Response.json(
      { error: "Failed to parse prescription. Please try again." },
      { status: 500 }
    )
  }
}
