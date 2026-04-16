import html2canvas from "html2canvas-pro"
import { jsPDF } from "jspdf"

// Brand color: #222222 → RGB(34, 34, 34)
const BRAND_R = 34
const BRAND_G = 34
const BRAND_B = 34

const COMPANY_NAME = "M 2 C MarkDowns Private Limited"
const LOGO_PATH = "/assets/logo/logo2.png"

interface DownloadReportPdfOptions {
  element: HTMLElement
  title: string
  submittedDate: string
  filename: string
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = src
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Failed to load logo"))
  })
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  c.getContext("2d")!.drawImage(img, 0, 0)
  return c.toDataURL("image/png")
}

function addHeader(pdf: jsPDF, logoData: string | null, pageWidth: number, margin: number) {
  const headerY = 6
  const logoSize = 10

  if (logoData) {
    pdf.addImage(logoData, "PNG", margin, headerY - 2, logoSize, logoSize)
  }

  const textX = logoData ? margin + logoSize + 3 : margin
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.setTextColor(BRAND_R, BRAND_G, BRAND_B)
  pdf.text(COMPANY_NAME, textX, headerY + 3)

  pdf.setFontSize(6)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(120, 120, 120)
  pdf.text("Quality Control Division", textX, headerY + 7)

  // Header line
  pdf.setDrawColor(BRAND_R, BRAND_G, BRAND_B)
  pdf.setLineWidth(0.5)
  pdf.line(margin, headerY + 10, pageWidth - margin, headerY + 10)
}

function addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, margin: number, pageNum: number, totalPages: number) {
  const footerY = pageHeight - 6
  pdf.setDrawColor(200, 200, 200)
  pdf.setLineWidth(0.3)
  pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3)

  pdf.setFontSize(6)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(150, 150, 150)
  pdf.text("Confidential — M2C MarkDowns Pvt. Ltd.", margin, footerY)
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" })
}

export async function downloadReportPdf({
  element,
  title,
  submittedDate,
  filename,
}: DownloadReportPdfOptions): Promise<void> {
  // Load logo
  let logoData: string | null = null
  try {
    logoData = await loadImageAsDataUrl(LOGO_PATH)
  } catch {
    // Continue without logo
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
  })

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const headerSpace = 18
  const footerSpace = 10
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - headerSpace - footerSpace - margin

  // Scale canvas image to fit page width
  const imgWidth = usableWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  // Split across pages — count content pages first
  let tempHeight = imgHeight
  let contentPages = 0
  while (tempHeight > 0) {
    contentPages++
    tempHeight -= usableHeight
  }
  const totalPages = contentPages + 1 // +1 for signature page

  // Now render content pages
  let remainingHeight = imgHeight
  let srcY = 0
  let pageNum = 1

  while (remainingHeight > 0) {
    if (srcY > 0) pdf.addPage()

    addHeader(pdf, logoData, pageWidth, margin)

    const sliceHeight = Math.min(remainingHeight, usableHeight)
    const srcSliceHeight = (sliceHeight / imgHeight) * canvas.height

    const sliceCanvas = document.createElement("canvas")
    sliceCanvas.width = canvas.width
    sliceCanvas.height = Math.ceil(srcSliceHeight)
    const ctx = sliceCanvas.getContext("2d")!
    ctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      srcSliceHeight,
      0,
      0,
      canvas.width,
      srcSliceHeight
    )

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95)
    pdf.addImage(sliceData, "JPEG", margin, headerSpace, imgWidth, sliceHeight)

    addFooter(pdf, pageWidth, pageHeight, margin, pageNum, totalPages)

    srcY += srcSliceHeight
    remainingHeight -= sliceHeight
    pageNum++
  }

  // Signature page
  pdf.addPage()
  addHeader(pdf, logoData, pageWidth, margin)

  let y = 35

  // Title
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.setTextColor(BRAND_R, BRAND_G, BRAND_B)
  pdf.text(title, pageWidth / 2, y, { align: "center" })
  y += 12

  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(100, 100, 100)
  pdf.text("Authorization & Sign-off", pageWidth / 2, y, { align: "center" })
  y += 15

  // Divider
  pdf.setDrawColor(BRAND_R, BRAND_G, BRAND_B)
  pdf.setLineWidth(0.8)
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 20

  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(11)

  const leftX = margin + 15
  const lineStartX = leftX + 55
  const lineEndX = pageWidth - margin - 15

  // Inspector Signature
  pdf.setFont("helvetica", "bold")
  pdf.text("Inspector Signature:", leftX, y)
  pdf.setDrawColor(150, 150, 150)
  pdf.setLineWidth(0.3)
  pdf.line(lineStartX, y + 1, lineEndX, y + 1)
  y += 25

  // Inspector Name
  pdf.text("Inspector Name:", leftX, y)
  pdf.line(lineStartX, y + 1, lineEndX, y + 1)
  y += 25

  // Date
  pdf.text("Date:", leftX, y)
  pdf.setFont("helvetica", "normal")
  pdf.text(submittedDate, lineStartX, y)
  pdf.line(lineStartX, y + 1, lineEndX, y + 1)
  y += 25

  // Company Stamp
  pdf.setFont("helvetica", "bold")
  pdf.text("Company Stamp:", leftX, y)
  y += 5
  pdf.setDrawColor(180, 180, 180)
  pdf.setLineWidth(0.3)
  pdf.setLineDashPattern([2, 2], 0)
  pdf.rect(lineStartX, y - 3, 55, 35)
  pdf.setLineDashPattern([], 0)
  y += 45

  // Divider
  pdf.setDrawColor(BRAND_R, BRAND_G, BRAND_B)
  pdf.setLineWidth(0.8)
  pdf.line(margin + 10, y, pageWidth - margin - 10, y)
  y += 10

  // Footer note
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "italic")
  pdf.setTextColor(120, 120, 120)
  pdf.text(
    "This is a system-generated report. Valid only with authorized signature and company stamp.",
    pageWidth / 2,
    y,
    { align: "center" }
  )
  y += 5
  pdf.text(
    `Report generated on: ${new Date().toLocaleString("en-IN")}`,
    pageWidth / 2,
    y,
    { align: "center" }
  )

  addFooter(pdf, pageWidth, pageHeight, margin, totalPages, totalPages)

  pdf.save(filename)
}
