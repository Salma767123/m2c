// PDF Generation Utility for Inspection Reports
// This file handles all PDF generation logic separately from React components

export const generateInspectionPDF = async (reportData, reportId) => {
  try {
    // Dynamic import to avoid SSR issues
    const { jsPDF } = await import('jspdf')
    
    // Create new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    
    // Helper function to add new page if needed
    const checkPageBreak = (yPos, requiredSpace = 20) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        pdf.addPage()
        return margin
      }
      return yPos
    }
    
    // Helper function to add section header with background color
    const addSectionHeader = (title, yPos) => {
      yPos = checkPageBreak(yPos, 15)
      
      // Add colored background for section header
      pdf.setFillColor(41, 128, 185) // Blue background
      pdf.rect(margin, yPos - 8, pageWidth - (margin * 2), 12, 'F')
      
      // Add white text on colored background
      pdf.setTextColor(255, 255, 255) // White text
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(title, margin + 2, yPos)
      
      // Reset text color to black
      pdf.setTextColor(0, 0, 0)
      return yPos + 12
    }
    
    // Helper function to add normal text
    const addText = (text, x, yPos, fontSize = 10, fontStyle = 'normal') => {
      pdf.setFontSize(fontSize)
      pdf.setFont('helvetica', fontStyle)
      pdf.text(text, x, yPos)
      return yPos
    }
    
    // Helper function to draw table with borders and colors
    const drawTable = (headers, data, yPos, colWidths) => {
      const tableStartY = yPos
      const rowHeight = 8
      let currentY = yPos
      
      // Draw table border
      pdf.setDrawColor(0, 0, 0) // Black border
      pdf.setLineWidth(0.5)
      
      // Draw header row with background
      pdf.setFillColor(240, 240, 240) // Light gray background for headers
      pdf.rect(margin, currentY - 6, pageWidth - (margin * 2), rowHeight, 'FD')
      
      // Header text
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      let xPosition = margin + 2
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, currentY)
        xPosition += colWidths[index]
      })
      currentY += rowHeight
      
      // Draw data rows
      pdf.setFont('helvetica', 'normal')
      data.forEach((row, rowIndex) => {
        currentY = checkPageBreak(currentY, rowHeight)
        
        // Alternate row colors
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(248, 249, 250) // Very light gray for alternate rows
          pdf.rect(margin, currentY - 6, pageWidth - (margin * 2), rowHeight, 'F')
        }
        
        xPosition = margin + 2
        row.forEach((cell, cellIndex) => {
          pdf.text(String(cell), xPosition, currentY)
          xPosition += colWidths[cellIndex]
        })
        currentY += rowHeight
      })
      
      // Draw table outline
      const tableHeight = (data.length + 1) * rowHeight
      pdf.setDrawColor(0, 0, 0)
      pdf.setLineWidth(1)
      pdf.rect(margin, tableStartY - 6, pageWidth - (margin * 2), tableHeight, 'D')
      
      // Draw vertical lines
      xPosition = margin
      colWidths.forEach((width) => {
        xPosition += width
        if (xPosition < pageWidth - margin) {
          pdf.line(xPosition, tableStartY - 6, xPosition, tableStartY - 6 + tableHeight)
        }
      })
      
      // Draw horizontal lines
      for (let i = 0; i <= data.length; i++) {
        const lineY = tableStartY - 6 + (i + 1) * rowHeight
        pdf.line(margin, lineY, pageWidth - margin, lineY)
      }
      
      return currentY + 5
    }
    
    let yPosition = margin
    
    // Company Header with border
    pdf.setDrawColor(41, 128, 185) // Blue border
    pdf.setLineWidth(2)
    pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 25, 'D')
    
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(41, 128, 185) // Blue text
    pdf.text('QUALITY CONTROL INSPECTION REPORT', pageWidth / 2, yPosition + 5, { align: 'center' })
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0) // Black text
    pdf.text('Nav Nit Group of Textiles', pageWidth / 2, yPosition + 15, { align: 'center' })
    yPosition += 35
    
    // Report Information Section
    yPosition = addSectionHeader('REPORT INFORMATION', yPosition)
    
    const reportInfo = [
      ['Report ID:', reportId],
      ['Inspection Date:', reportData.inspectionDate],
      ['Inspector:', reportData.inspector],
      ['Client:', reportData.client],
      ['Vendor:', reportData.vendor],
      ['Factory:', reportData.factory],
      ['Service Location:', reportData.serviceLocation],
      ['PO Number:', reportData.po],
      ['Service Type:', reportData.serviceType]
    ]
    
    // Create info table with borders
    const infoTableData = []
    for (let i = 0; i < reportInfo.length; i += 2) {
      const row = []
      row.push(reportInfo[i][0], reportInfo[i][1])
      if (i + 1 < reportInfo.length) {
        row.push(reportInfo[i + 1][0], reportInfo[i + 1][1])
      } else {
        row.push('', '')
      }
      infoTableData.push(row)
    }
    
    yPosition = drawTable(
      ['Field', 'Value', 'Field', 'Value'],
      infoTableData,
      yPosition,
      [40, 50, 40, 50]
    )
    
    yPosition += 10
    
    // Overall Result Section with colored box
    yPosition = addSectionHeader('INSPECTION RESULT', yPosition)
    
    // Result box with color based on status
    let resultColor = [0, 128, 0] // Green for PASSED
    if (reportData.result === 'FAILED') {
      resultColor = [220, 53, 69] // Red for FAILED
    } else if (reportData.result === 'PENDING') {
      resultColor = [255, 193, 7] // Yellow for PENDING
    }
    
    pdf.setFillColor(resultColor[0], resultColor[1], resultColor[2])
    pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), 15, 'F')
    
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(255, 255, 255) // White text
    pdf.text(`OVERALL RESULT: ${reportData.result}`, pageWidth / 2, yPosition + 5, { align: 'center' })
    pdf.setTextColor(0, 0, 0) // Reset to black
    yPosition += 25
    
    // Items Inspected Section
    yPosition = addSectionHeader('ITEMS INSPECTED', yPosition)
    
    const itemsData = reportData.items.map(item => [
      item.itemName,
      item.itemDescription.length > 35 ? item.itemDescription.substring(0, 35) + '...' : item.itemDescription,
      item.poQuantity.toLocaleString(),
      item.inspectedQuantity.toString()
    ])

    yPosition = drawTable(
      ['Item Name', 'Description', 'PO Qty', 'Inspected'],
      itemsData,
      yPosition,
      [45, 80, 30, 30]
    )
    
    yPosition += 10
    
    // Packaging & Labeling Section
    yPosition = addSectionHeader('PACKAGING & LABELING VERIFICATION', yPosition)
    
    const packagingData = Object.entries(reportData.packaging).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
      const result = Array.isArray(value) ? value.join(', ') : value
      return [label, result.toUpperCase()]
    })
    
    yPosition = drawTable(
      ['Check Item', 'Result'],
      packagingData,
      yPosition,
      [90, 90]
    )
    
    yPosition += 10
    
    // Quality Testing Section
    yPosition = addSectionHeader('QUALITY TESTING RESULTS', yPosition)
    
    const testingData = Object.entries(reportData.testing).map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
      return [label, value.toUpperCase()]
    })
    
    yPosition = drawTable(
      ['Test Item', 'Result'],
      testingData,
      yPosition,
      [90, 90]
    )
    
    yPosition += 10
    
    // Measurements Section
    yPosition = addSectionHeader('PHYSICAL MEASUREMENTS', yPosition)
    
    const measurementData = reportData.measurements.map(measurement => [
      measurement.sampleName,
      `${measurement.cartonLength}×${measurement.cartonWidth}×${measurement.cartonHeight}`,
      `${measurement.productLength}×${measurement.productWidth}`,
      measurement.retailWeight.toString(),
      measurement.cartonGrossWeight.toString(),
      measurement.status
    ])
    
    yPosition = drawTable(
      ['Sample', 'Carton L×W×H (cm)', 'Product L×W (cm)', 'Retail Wt (kg)', 'Gross Wt (kg)', 'Status'],
      measurementData,
      yPosition,
      [20, 35, 30, 25, 25, 20]
    )
    
    yPosition += 10
    
    // AQL Defects Section
    yPosition = addSectionHeader('AQL DEFECTS SUMMARY', yPosition)
    
    // Defects summary with colored boxes
    pdf.setFillColor(220, 53, 69) // Red background for major defects
    pdf.rect(margin, yPosition - 5, 80, 12, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Major Defects: ${reportData.defects.majorDefects}`, margin + 2, yPosition + 2)
    
    pdf.setFillColor(255, 193, 7) // Yellow background for minor defects
    pdf.rect(margin + 90, yPosition - 5, 80, 12, 'F')
    pdf.setTextColor(0, 0, 0)
    pdf.text(`Minor Defects: ${reportData.defects.minorDefects}`, margin + 92, yPosition + 2)
    
    pdf.setTextColor(0, 0, 0) // Reset to black
    yPosition += 20
    
    if (reportData.defects.minorDefectDetails) {
      yPosition = checkPageBreak(yPosition, 20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Minor Defect Details:', margin, yPosition)
      yPosition += 8
      
      // Details box with border
      pdf.setDrawColor(200, 200, 200)
      pdf.setFillColor(248, 249, 250)
      const detailsHeight = 15
      pdf.rect(margin, yPosition - 5, pageWidth - (margin * 2), detailsHeight, 'FD')
      
      pdf.setFont('helvetica', 'normal')
      pdf.text(reportData.defects.minorDefectDetails, margin + 2, yPosition + 2)
      yPosition += detailsHeight + 5
    }
    
    yPosition += 15
    
    // Footer with border
    yPosition = checkPageBreak(yPosition, 20)
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 5
    
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(100, 100, 100)
    pdf.text('This report is generated electronically and is valid without signature.', margin, yPosition)
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition + 5)
    
    // Save the PDF
    const fileName = `${reportData.vendor.replace(/\s+/g, '_')}_${reportId}_Inspection_Report.pdf`
    pdf.save(fileName)
    
    return { success: true, fileName }
    
  } catch (error) {
    console.error('Error generating PDF with jsPDF:', error)
    throw error
  }
}

// Fallback HTML print function with enhanced styling
export const generateHTMLReport = (reportData, reportId) => {
  try {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check popup blocker settings.')
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inspection Report - ${reportId}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border: 3px solid #2980b9;
              padding: 20px;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            }
            .header h1 { 
              color: #2980b9; 
              margin: 0 0 10px 0;
              font-size: 24px;
              font-weight: bold;
            }
            .header h2 { 
              color: #666; 
              margin: 0;
              font-size: 18px;
              font-weight: normal;
            }
            .section { 
              margin: 20px 0;
              page-break-inside: avoid;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              overflow: hidden;
            }
            .section h3 { 
              color: white; 
              background: #2980b9;
              margin: 0;
              padding: 12px 15px;
              font-size: 14px;
              font-weight: bold;
            }
            .section-content {
              padding: 15px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 10px 0;
              border: 2px solid #2980b9;
            }
            th { 
              background: #f8f9fa;
              border: 1px solid #dee2e6; 
              padding: 12px 8px; 
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              color: #2980b9;
            }
            td { 
              border: 1px solid #dee2e6; 
              padding: 10px 8px; 
              text-align: left;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            tr:hover {
              background-color: #e3f2fd;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin: 15px 0;
            }
            .info-item {
              margin: 8px 0;
              padding: 8px;
              background: #f8f9fa;
              border-left: 4px solid #2980b9;
              border-radius: 4px;
            }
            .info-label {
              font-weight: bold;
              color: #2980b9;
              display: inline-block;
              width: 120px;
            }
            .result-box {
              text-align: center;
              padding: 20px;
              margin: 15px 0;
              border-radius: 8px;
              font-size: 18px;
              font-weight: bold;
            }
            .result-passed { 
              background: #d4edda; 
              color: #155724; 
              border: 2px solid #28a745;
            }
            .result-failed { 
              background: #f8d7da; 
              color: #721c24; 
              border: 2px solid #dc3545;
            }
            .result-pending { 
              background: #fff3cd; 
              color: #856404; 
              border: 2px solid #ffc107;
            }
            .defects-summary {
              display: flex;
              gap: 20px;
              margin: 15px 0;
            }
            .defect-box {
              flex: 1;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              font-weight: bold;
            }
            .major-defects {
              background: #f8d7da;
              color: #721c24;
              border: 2px solid #dc3545;
            }
            .minor-defects {
              background: #fff3cd;
              color: #856404;
              border: 2px solid #ffc107;
            }
            .defect-details {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 15px;
              margin: 10px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #2980b9;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>QUALITY CONTROL INSPECTION REPORT</h1>
            <h2>Nav Nit Group of Textiles</h2>
          </div>
          
          <div class="section">
            <h3>Report Information</h3>
            <div class="section-content">
              <div class="info-grid">
                <div>
                  <div class="info-item"><span class="info-label">Report ID:</span> ${reportId}</div>
                  <div class="info-item"><span class="info-label">Inspection Date:</span> ${reportData.inspectionDate}</div>
                  <div class="info-item"><span class="info-label">Inspector:</span> ${reportData.inspector}</div>
                  <div class="info-item"><span class="info-label">Client:</span> ${reportData.client}</div>
                  <div class="info-item"><span class="info-label">Vendor:</span> ${reportData.vendor}</div>
                </div>
                <div>
                  <div class="info-item"><span class="info-label">Factory:</span> ${reportData.factory}</div>
                  <div class="info-item"><span class="info-label">Service Location:</span> ${reportData.serviceLocation}</div>
                  <div class="info-item"><span class="info-label">PO Number:</span> ${reportData.po}</div>
                  <div class="info-item"><span class="info-label">Service Type:</span> ${reportData.serviceType}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Inspection Result</h3>
            <div class="section-content">
              <div class="result-box result-${reportData.result.toLowerCase()}">
                OVERALL RESULT: ${reportData.result}
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3>Items Inspected</h3>
            <div class="section-content">
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>PO Quantity</th>
                    <th>Inspected</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.items.map(item => `
                    <tr>
                      <td><strong>${item.itemName}</strong></td>
                      <td>${item.itemDescription}</td>
                      <td>${item.poQuantity.toLocaleString()}</td>
                      <td>${item.inspectedQuantity}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <h3>Packaging & Labeling Verification</h3>
            <div class="section-content">
              <table>
                <thead>
                  <tr>
                    <th>Check Item</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData.packaging).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
                    const result = Array.isArray(value) ? value.join(', ') : value
                    return `
                      <tr>
                        <td>${label}</td>
                        <td><strong>${result.toUpperCase()}</strong></td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <h3>Quality Testing Results</h3>
            <div class="section-content">
              <table>
                <thead>
                  <tr>
                    <th>Test Item</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(reportData.testing).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
                    return `
                      <tr>
                        <td>${label}</td>
                        <td><strong>${value.toUpperCase()}</strong></td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <h3>Physical Measurements</h3>
            <div class="section-content">
              <table>
                <thead>
                  <tr>
                    <th>Sample</th>
                    <th>Carton L×W×H (cm)</th>
                    <th>Product L×W (cm)</th>
                    <th>Retail Weight (kg)</th>
                    <th>Gross Weight (kg)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.measurements.map(m => `
                    <tr>
                      <td><strong>${m.sampleName}</strong></td>
                      <td>${m.cartonLength}×${m.cartonWidth}×${m.cartonHeight}</td>
                      <td>${m.productLength}×${m.productWidth}</td>
                      <td>${m.retailWeight}</td>
                      <td>${m.cartonGrossWeight}</td>
                      <td><strong>${m.status}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="section">
            <h3>AQL Defects Summary</h3>
            <div class="section-content">
              <div class="defects-summary">
                <div class="defect-box major-defects">
                  <div>Major Defects</div>
                  <div style="font-size: 24px; margin-top: 10px;">${reportData.defects.majorDefects}</div>
                </div>
                <div class="defect-box minor-defects">
                  <div>Minor Defects</div>
                  <div style="font-size: 24px; margin-top: 10px;">${reportData.defects.minorDefects}</div>
                </div>
              </div>
              ${reportData.defects.minorDefectDetails ? `
                <div class="defect-details">
                  <strong>Minor Defect Details:</strong><br>
                  ${reportData.defects.minorDefectDetails}
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="footer">
            <p>This report is generated electronically and is valid without signature.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; background: #2980b9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 10px;">Print Report</button>
            <button onclick="window.close()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Close</button>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Auto-focus the print window
    printWindow.focus()
    
    return { success: true, method: 'html' }
    
  } catch (error) {
    console.error('Error generating HTML report:', error)
    throw error
  }
}

// Main export function that tries PDF first, then falls back to HTML
export const downloadInspectionReport = async (reportData, reportId) => {
  try {
    // Try PDF generation first
    const result = await generateInspectionPDF(reportData, reportId)
    return result
  } catch (pdfError) {
    console.warn('PDF generation failed, falling back to HTML print:', pdfError)
    
    try {
      // Fallback to HTML print
      const result = generateHTMLReport(reportData, reportId)
      return result
    } catch (htmlError) {
      console.error('Both PDF and HTML generation failed:', htmlError)
      throw new Error('Unable to generate report. Please try again or contact support.')
    }
  }
}