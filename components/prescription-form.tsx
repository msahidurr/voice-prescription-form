"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PrescriptionData, Medicine } from "@/lib/prescription-types"


interface PrescriptionFormProps {
  data: PrescriptionData
  onDataChange: (data: PrescriptionData) => void
}

function Section({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="text-sm">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">None.</p>
      )}
    </div>
  )
}

function MedicineItem({ medicine }: { medicine: Medicine }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-1">
      <p className="font-medium text-sm">{medicine.name}</p>
      <p className="text-sm text-muted-foreground">
        {medicine.frequency} — {medicine.duration}
        {medicine.instructions && ` (${medicine.instructions})`}
      </p>
    </div>
  )
}

export function PrescriptionForm({
  data,
  onDataChange,
}: PrescriptionFormProps) {
  const updatePatientInfo = (field: keyof PrescriptionData, value: string) => {
    onDataChange({ ...data, [field]: value })
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg">Prescription Details</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  value={data.patientName}
                  onChange={(e) => updatePatientInfo("patientName", e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  value={data.age}
                  onChange={(e) => updatePatientInfo("age", e.target.value)}
                  placeholder="e.g., 25 years"
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Input
                  id="sex"
                  value={data.sex}
                  onChange={(e) => updatePatientInfo("sex", e.target.value)}
                  placeholder="Male/Female"
                />
              </div>
            </div>

            {/* Vitals */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Vitals</h3>
              {Object.entries(data.vitals).some(([, v]) => v) ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {data.vitals.bloodPressure && (
                    <p>BP: {data.vitals.bloodPressure}</p>
                  )}
                  {data.vitals.temperature && (
                    <p>Temp: {data.vitals.temperature}</p>
                  )}
                  {data.vitals.pulse && <p>Pulse: {data.vitals.pulse}</p>}
                  {data.vitals.weight && <p>Weight: {data.vitals.weight}</p>}
                  {data.vitals.height && <p>Height: {data.vitals.height}</p>}
                  {data.vitals.spo2 && <p>SpO2: {data.vitals.spo2}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None.</p>
              )}
            </div>

            <Section title="Chief Complaints" items={data.chiefComplaints} />
            <Section title="Chronic Diseases" items={data.chronicDiseases} />
            <Section title="Allergies" items={data.allergies} />
            <Section title="Investigations" items={data.investigations} />
            <Section title="Diagnosis" items={data.diagnosis} />

            {/* Medicines */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Medicines</h3>
              {data.medicines.length > 0 ? (
                <div className="space-y-2">
                  {data.medicines.map((medicine, index) => (
                    <MedicineItem key={index} medicine={medicine} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None.</p>
              )}
            </div>

            <Section title="Advice" items={data.advice} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
