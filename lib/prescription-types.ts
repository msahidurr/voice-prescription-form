export interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Vitals {
  height?: string
  weight?: string
  temperature?: string
  bloodPressure?: string
  pulse?: string
  spo2?: string
}

export interface PrescriptionData {
  // Patient Info
  patientName: string
  age: string
  sex: string
  date: string

  // Doctor Info
  doctorName: string
  doctorQualification: string
  doctorRegNo: string

  // Medical Data
  vitals: Vitals
  chiefComplaints: string[]
  chronicDiseases: string[]
  allergies: string[]
  investigations: string[]
  diagnosis: string[]
  medicines: Medicine[]
  advice: string[]
}

export const defaultPrescriptionData: PrescriptionData = {
  patientName: "",
  age: "",
  sex: "",
  date: new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  doctorName: "Dr. Mirza Faiza Tasnim",
  doctorQualification: "MBBS",
  doctorRegNo: "BMDC-106687",
  vitals: {},
  chiefComplaints: [],
  chronicDiseases: [],
  allergies: [],
  investigations: [],
  diagnosis: [],
  medicines: [],
  advice: [],
}
