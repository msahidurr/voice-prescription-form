import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

const medicineSchema = z.object({
  name: z.string().describe("Medicine name with strength/dosage form"),
  dosage: z.string().describe("Dosage amount"),
  frequency: z.string().describe("How often to take, e.g., 1+0+1, 1+1+1"),
  duration: z.string().describe("Duration, e.g., 3 days, 5 days, 1 week"),
  instructions: z
    .string()
    .nullable()
    .describe("Special instructions like after meal, before sleep"),
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
  patientName: z.string().nullable(),
  age: z.string().nullable(),
  sex: z.string().nullable(),
  vitals: vitalsSchema,
  chiefComplaints: z.array(z.string()),
  chronicDiseases: z.array(z.string()),
  allergies: z.array(z.string()),
  investigations: z.array(z.string()),
  diagnosis: z.array(z.string()),
  medicines: z.array(medicineSchema),
  advice: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    return Response.json({
      prescription: {
        patientName: "ABC",
        age: "25",
        sex: "Male",
        vitals: {
          bloodPressure: "120/80",
        },
        chiefComplaints: ["Cough"],
        chronicDiseases: [],
        allergies: [],
        investigations: ["CBC"],
        diagnosis: ["Viral fever"],
        medicines: [
          {
            name: "Napa 500",
            dosage: "500mg",
            frequency: "1+1+1",
            duration: "3 days",
            instructions: "After meal",
          },
        ],
        advice: ["Take rest"],
      },
    })
  } catch (error) {
    return Response.json({
      prescription: {
        patientName: "ABC",
        age: "25",
        sex: "Male",
        vitals: {
          bloodPressure: "120/80",
        },
        chiefComplaints: ["Cough"],
        chronicDiseases: [],
        allergies: [],
        investigations: ["CBC"],
        diagnosis: ["Viral fever"],
        medicines: [
          {
            name: "Napa 500",
            dosage: "500mg",
            frequency: "1+1+1",
            duration: "3 days",
            instructions: "After meal",
          },
        ],
        advice: ["Take rest"],
      },
    })
  }
}