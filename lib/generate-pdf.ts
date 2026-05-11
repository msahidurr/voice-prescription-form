import type { PrescriptionData } from "./prescription-types"
import jsPDF from "jspdf"

export function generatePrescriptionPDF(data: PrescriptionData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = 20

  // Header - Doctor Info
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(data.doctorName, pageWidth / 2, y, { align: "center" })
  y += 7

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`${data.doctorQualification}, ${data.doctorRegNo}`, pageWidth / 2, y, {
    align: "center",
  })
  y += 10

  // Divider line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Patient Info
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Name: ", margin, y)
  doc.setFont("helvetica", "normal")
  doc.text(data.patientName || "N/A", margin + 15, y)

  const patientInfoRight = `Age: ${data.age || "N/A"}  |  Sex: ${data.sex || "N/A"}  |  Date: ${data.date}`
  doc.text(patientInfoRight, pageWidth - margin, y, { align: "right" })
  y += 12

  // Divider
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Chief Complaints
  if (data.chiefComplaints.length > 0) {
    doc.setFont("helvetica", "bold")
    doc.text("Chief Complaints", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    data.chiefComplaints.forEach((complaint) => {
      const lines = doc.splitTextToSize(`• ${complaint}`, contentWidth)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5
    })
    y += 5
  }

  // On Examination (Vitals)
  if (Object.values(data.vitals).some((v) => v)) {
    doc.setFont("helvetica", "bold")
    doc.text("On Examination", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    
    const vitals = []
    if (data.vitals.height) vitals.push(`Height: ${data.vitals.height}`)
    if (data.vitals.weight) vitals.push(`Weight: ${data.vitals.weight}`)
    if (data.vitals.temperature) vitals.push(`Temperature: ${data.vitals.temperature}`)
    if (data.vitals.bloodPressure) vitals.push(`Blood Pressure: ${data.vitals.bloodPressure}`)
    if (data.vitals.pulse) vitals.push(`Pulse: ${data.vitals.pulse}`)
    if (data.vitals.spo2) vitals.push(`SpO2: ${data.vitals.spo2}`)
    
    vitals.forEach((vital) => {
      doc.text(`• ${vital}`, margin + 5, y)
      y += 5
    })
    y += 5
  }

  // Diagnosis
  if (data.diagnosis.length > 0) {
    doc.setFont("helvetica", "bold")
    doc.text("Diagnosis", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    data.diagnosis.forEach((diag) => {
      const lines = doc.splitTextToSize(`• ${diag}`, contentWidth)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5
    })
    y += 5
  }

  // Investigations
  if (data.investigations.length > 0) {
    doc.setFont("helvetica", "bold")
    doc.text("Investigations", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    data.investigations.forEach((inv) => {
      const lines = doc.splitTextToSize(`• ${inv}`, contentWidth)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5
    })
    y += 5
  }

  // Rx Section
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Rx", margin, y)
  y += 8

  doc.setFontSize(11)
  if (data.medicines.length > 0) {
    data.medicines.forEach((medicine, index) => {
      // Check if we need a new page
      if (y > 260) {
        doc.addPage()
        y = 20
      }

      doc.setFont("helvetica", "bold")
      doc.text(`${index + 1}. ${medicine.name}`, margin + 5, y)
      y += 5
      
      doc.setFont("helvetica", "normal")
      let dosageText = `   ${medicine.frequency}`
      if (medicine.duration) dosageText += ` — ${medicine.duration}`
      if (medicine.instructions) dosageText += ` (${medicine.instructions})`
      
      const lines = doc.splitTextToSize(dosageText, contentWidth - 10)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5 + 3
    })
  } else {
    doc.setFont("helvetica", "normal")
    doc.text("No medicines prescribed", margin + 5, y)
    y += 8
  }

  y += 5

  // Advice
  if (data.advice.length > 0) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setFont("helvetica", "bold")
    doc.text("Advice", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    data.advice.forEach((adv) => {
      const lines = doc.splitTextToSize(`• ${adv}`, contentWidth)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5
    })
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(9)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(128, 128, 128)
  doc.text("Your health, Take care", pageWidth / 2, footerY, { align: "center" })

  // Download the PDF
  const fileName = `prescription_${data.patientName?.replace(/\s+/g, "_") || "patient"}_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}
