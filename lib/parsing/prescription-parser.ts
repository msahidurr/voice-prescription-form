/**
 * Prescription Parser Utility
 * Converts text transcripts to structured prescription JSON using LLM
 */

import { generateObject } from 'ai'
import { azure } from '@ai-sdk/azure'
import { z } from 'zod'
import { PrescriptionData } from '@/lib/prescription-types'

// Zod schemas for prescription parsing
const medicineSchema = z.object({
  name: z.string().describe('Medicine name with strength/dosage form'),
  dosage: z.string().describe('Dosage amount'),
  frequency: z.string().describe('How often to take, e.g., 1+0+1, 1+1+1'),
  duration: z.string().describe('Duration, e.g., 3 days, 5 days, 1 week'),
  instructions: z
    .string()
    .nullable()
    .describe('Special instructions like after meal, before sleep'),
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
  doctorName: z.string().nullable(),
  doctorQualification: z.string().nullable(),
  doctorRegNo: z.string().nullable(),
  date: z.string(),
  vitals: vitalsSchema,
  chiefComplaints: z.array(z.string()),
  chronicDiseases: z.array(z.string()),
  allergies: z.array(z.string()),
  investigations: z.array(z.string()),
  diagnosis: z.array(z.string()),
  medicines: z.array(medicineSchema),
  advice: z.array(z.string()),
})

export interface PrescriptionParserResult {
  success: boolean
  prescription?: Partial<PrescriptionData>
  error?: string
}

/**
 * Parse text transcript into structured prescription JSON
 * Uses Azure OpenAI to extract and structure prescription data
 */
export async function parseTextToPrescription(
  transcript: string
): Promise<PrescriptionParserResult> {
  try {
    if (!transcript?.trim()) {
      return {
        success: false,
        error: 'Transcript is empty or invalid',
      }
    }

    if (transcript.length < 10) {
      return {
        success: false,
        error: 'Transcript too short. Please provide at least 10 characters.',
      }
    }

    if (transcript.length > 2000) {
      return {
        success: false,
        error: 'Transcript exceeds maximum length of 2000 characters',
      }
    }

    const { object } = await generateObject({
      model: azure('hisl-rx'),
      schema: prescriptionSchema,
      messages: [
        {
          role: 'system',
          content: `You are a medical prescription parser. Extract structured prescription data from a doctor's voice transcript or text description.

Extract:
- Patient details (name, age, sex)
- Doctor details (name, qualification, registration number)
- Date of prescription
- Vital signs (height, weight, temperature, blood pressure, pulse, SpO2)
- Chief complaints (list of symptoms)
- Chronic diseases (ongoing conditions)
- Allergies (known allergies)
- Investigations (tests to perform)
- Diagnosis (medical conditions identified)
- Medicines (with dosage, frequency, duration, instructions)
- Advice (general health advice)

Medicine frequency patterns:
- 1+1+1 = morning + afternoon + night (three times daily)
- 1+0+1 = morning + night (twice daily)
- 1+0+0 = morning only
- 0+0+1 = night only
- SOS/PRN = when needed/as required

If data is missing, use null for single values and empty arrays for lists.
Use today's date if no date is specified.`,
        },
        {
          role: 'user',
          content: transcript,
        },
      ],
    })

    return {
      success: true,
      prescription: object as Partial<PrescriptionData>,
    }
  } catch (error) {
    console.error('[v0] Prescription parsing error:', error)
    return {
      success: false,
      error: 'Failed to parse prescription. The transcript may not contain valid prescription data.',
    }
  }
}

/**
 * Validate and normalize prescription data
 */
export function normalizePrescription(
  prescription: Partial<PrescriptionData>
): Partial<PrescriptionData> {
  return {
    patientName: prescription.patientName || '',
    age: prescription.age || '',
    sex: prescription.sex || '',
    doctorName: prescription.doctorName || '',
    doctorQualification: prescription.doctorQualification || '',
    doctorRegNo: prescription.doctorRegNo || '',
    date: prescription.date || new Date().toLocaleDateString('en-GB'),
    vitals: prescription.vitals || {},
    chiefComplaints: Array.isArray(prescription.chiefComplaints) 
      ? prescription.chiefComplaints.filter(c => c && c.trim()) 
      : [],
    chronicDiseases: Array.isArray(prescription.chronicDiseases) 
      ? prescription.chronicDiseases.filter(c => c && c.trim()) 
      : [],
    allergies: Array.isArray(prescription.allergies) 
      ? prescription.allergies.filter(a => a && a.trim()) 
      : [],
    investigations: Array.isArray(prescription.investigations) 
      ? prescription.investigations.filter(i => i && i.trim()) 
      : [],
    diagnosis: Array.isArray(prescription.diagnosis) 
      ? prescription.diagnosis.filter(d => d && d.trim()) 
      : [],
    medicines: Array.isArray(prescription.medicines) 
      ? prescription.medicines.filter(m => m && m.name && m.name.trim()) 
      : [],
    advice: Array.isArray(prescription.advice) 
      ? prescription.advice.filter(a => a && a.trim()) 
      : [],
  }
}
