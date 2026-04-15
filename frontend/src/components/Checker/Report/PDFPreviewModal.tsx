"use client"

import { useState, useEffect } from "react"
import { X, Download, Eye } from "lucide-react"
import { downloadInspectionReport } from "@/lib/pdfGenerator"
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

interface PDFPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  reportData: any
  reportId: string
}

export default function PDFPreviewModal({ isOpen, onClose, reportData, reportId }: PDFPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const result = await downloadInspectionReport(reportData, reportId)
      
      if (result.success) {
        if ('method' in result && result.method === 'html') {
          showSuccessToast('Report Generated', 'Report opened in new window for printing.')
        } else if ('fileName' in result) {
          showSuccessToast('Download Complete', `PDF report has been downloaded: ${result.fileName}`)
        }
        // Close modal after successful download
        onClose()
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report. Please try again.'
      showErrorToast('Download Failed', errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">PDF Preview</h2>
              <p className="text-sm text-slate-600">Report ID: {reportId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* PDF Preview Content */}
          <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">QUALITY CONTROL INSPECTION REPORT</h1>
              <h2 className="text-lg text-slate-700">Nav Nit Group of Textiles</h2>
              <hr className="my-4 border-slate-300" />
            </div>

            {/* Report Information */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">REPORT INFORMATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-semibold">Report ID:</span> {reportId}</div>
                  <div><span className="font-semibold">Inspection Date:</span> {reportData.inspectionDate}</div>
                  <div><span className="font-semibold">Inspector:</span> {reportData.inspector}</div>
                  <div><span className="font-semibold">Client:</span> {reportData.client}</div>
                  <div><span className="font-semibold">Vendor:</span> {reportData.vendor}</div>
                </div>
                <div className="space-y-2">
                  <div><span className="font-semibold">Factory:</span> {reportData.factory}</div>
                  <div><span className="font-semibold">Service Location:</span> {reportData.serviceLocation}</div>
                  <div><span className="font-semibold">PO Number:</span> {reportData.po}</div>
                  <div><span className="font-semibold">Service Type:</span> {reportData.serviceType}</div>
                </div>
              </div>
            </div>

            {/* Inspection Result */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">INSPECTION RESULT</h3>
              <div className={`text-xl font-bold ${
                reportData.result === 'PASSED' ? 'text-green-600' : 
                reportData.result === 'FAILED' ? 'text-red-600' : 'text-orange-600'
              }`}>
                OVERALL RESULT: {reportData.result}
              </div>
            </div>

            {/* Items Inspected */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">ITEMS INSPECTED</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Item Name</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Description</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">PO Quantity</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Inspected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="border border-slate-300 px-3 py-2">{item.itemName}</td>
                        <td className="border border-slate-300 px-3 py-2">{item.itemDescription}</td>
                        <td className="border border-slate-300 px-3 py-2">{item.poQuantity.toLocaleString()}</td>
                        <td className="border border-slate-300 px-3 py-2">{item.inspectedQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Packaging & Labeling */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">PACKAGING & LABELING VERIFICATION</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(reportData.packaging).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
                  const result = Array.isArray(value) ? value.join(', ') : String(value)
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="font-semibold">{label}:</span>
                      <span className="uppercase">{result}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quality Testing */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">QUALITY TESTING RESULTS</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(reportData.testing).map(([key, value]) => {
                  const label = key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="font-semibold">{label}:</span>
                      <span className="uppercase">{String(value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">PHYSICAL MEASUREMENTS</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Sample</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Carton L×W×H (cm)</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Product L×W (cm)</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Retail Weight (kg)</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Gross Weight (kg)</th>
                      <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.measurements.map((measurement: any, index: number) => (
                      <tr key={index}>
                        <td className="border border-slate-300 px-3 py-2">{measurement.sampleName}</td>
                        <td className="border border-slate-300 px-3 py-2">
                          {measurement.cartonLength}×{measurement.cartonWidth}×{measurement.cartonHeight}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          {measurement.productLength}×{measurement.productWidth}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">{measurement.retailWeight}</td>
                        <td className="border border-slate-300 px-3 py-2">{measurement.cartonGrossWeight}</td>
                        <td className="border border-slate-300 px-3 py-2">{measurement.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AQL Defects Summary */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">AQL DEFECTS SUMMARY</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Major Defects:</span> {reportData.defects.majorDefects}</div>
                <div><span className="font-semibold">Minor Defects:</span> {reportData.defects.minorDefects}</div>
                {reportData.defects.minorDefectDetails && (
                  <div>
                    <span className="font-semibold">Minor Defect Details:</span>
                    <p className="mt-1 bg-slate-50 p-2 rounded">{reportData.defects.minorDefectDetails}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-300 pt-4 text-xs text-slate-600">
              <p>This report is generated electronically and is valid without signature.</p>
              <p>Generated on: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}