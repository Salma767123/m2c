"use client"

import { CheckCircle, AlertTriangle } from "lucide-react"

interface ReviewProps {
  formData: {
    // General Information
    client: string
    vendor: string
    factory: string
    serviceLocation: string
    serviceStartDate: string
    serviceType: string
    // Order Information
    items: Array<{
      id: number
      itemName: string
      itemDescription: string
      totalQuantity: number
      inspectionQuantity: number
      status: string
    }>
    packedQuantity: number
    cartonCount: number
    // Packaging Remarks (single selection 1-10)
    shipperCartonRemark: string
    innerCartonRemark: string
    retailPackagingRemark: string
    productTypeRemark: string
    aqlWorkmanshipRemark: string
    onSiteTestsRemark: string
    // Quality Metrics
    criticalDefects: number
    majorDefects: number
    minorDefects: number
    maxAllowedCritical: number
    maxAllowedMajor: number
    maxAllowedMinor: number
  }
}

export default function Review({ formData }: ReviewProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      "Pending": "bg-amber-100 text-amber-800 border-amber-200",
      "Ready": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
      "Completed": "bg-slate-100 text-slate-800 border-slate-200",
    }
    return colors[status as keyof typeof colors] || colors["Pending"]
  }

  // Collect all remark codes and calculate average
  const getRemarkAnalysis = () => {
    const remarkCodes: number[] = []
    const remarkDetails: Array<{ category: string, code: string }> = []

    const categories = [
      { key: 'shipperCartonRemark', label: 'Shipper Carton Packaging' },
      { key: 'innerCartonRemark', label: 'Inner Carton Packaging' },
      { key: 'retailPackagingRemark', label: 'Retail Packaging' },
      { key: 'productTypeRemark', label: 'Product Type' },
      { key: 'aqlWorkmanshipRemark', label: 'AQL Workmanship' },
      { key: 'onSiteTestsRemark', label: 'On-site Tests' }
    ]

    categories.forEach(category => {
      const remarkValue = formData[category.key as keyof typeof formData] as string
      if (remarkValue && remarkValue.trim()) {
        const code = parseInt(remarkValue.trim())
        if (!isNaN(code) && code >= 1 && code <= 10) {
          remarkCodes.push(code)
          remarkDetails.push({ category: category.label, code: remarkValue.trim() })
        }
      }
    })

    const average = remarkCodes.length > 0 ? remarkCodes.reduce((sum, code) => sum + code, 0) / remarkCodes.length : 0

    return {
      codes: remarkCodes,
      details: remarkDetails,
      average: average,
      count: remarkCodes.length
    }
  }

  // Calculate overall result based on remark code average
  const calculateOverallResult = () => {
    const remarkAnalysis = getRemarkAnalysis()

    // If no remark codes, consider as perfect (10)
    const effectiveAverage = remarkAnalysis.count === 0 ? 10 : remarkAnalysis.average

    let status: string
    let description: string

    if (effectiveAverage >= 8) {
      status = 'PASS'
      description = 'Quality standards met successfully'
    } else if (effectiveAverage >= 6) {
      status = 'RE-INSPECTION'
      description = 'Re-inspection required due to quality concerns'
    } else {
      status = 'REJECTED'
      description = 'Quality standards not met - product rejected'
    }

    return {
      status,
      description,
      average: effectiveAverage,
      remarkCodes: remarkAnalysis.codes,
      remarkDetails: remarkAnalysis.details,
      totalRemarks: remarkAnalysis.count
    }
  }

  const overallResult = calculateOverallResult()

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Review & Submit Inspection Report</h2>
        <p className="text-slate-600">Final review of all inspection data before submission</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            General Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Client:</span>
              <span className="text-slate-900 font-medium">{formData.client || "Not specified"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Vendor:</span>
              <span className="text-slate-900 font-medium">{formData.vendor}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Factory:</span>
              <span className="text-slate-900 font-medium">{formData.factory || "Not specified"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Service Location:</span>
              <span className="text-slate-900 font-medium">{formData.serviceLocation || "Not specified"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Service Date:</span>
              <span className="text-slate-900 font-medium">{formData.serviceStartDate || "Not specified"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Service Type:</span>
              <span className="text-slate-900 font-medium">{formData.serviceType}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Order Information
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Total Items:</span>
              <span className="text-slate-900">{formData.items.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-200">
              <span className="text-slate-600">Total Quantity:</span>
              <span className="text-slate-900">{formData.packedQuantity} units</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Cartons:</span>
              <span className="text-slate-900">{formData.cartonCount} cartons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Details */}
      {formData.items.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            Order Items Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Item</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Description</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Total Qty</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Inspection Qty</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {formData.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 text-slate-900 font-medium">{item.itemName}</td>
                    <td className="py-3 px-3 text-slate-600">{item.itemDescription}</td>
                    <td className="py-3 px-3 text-slate-900">{item.totalQuantity}</td>
                    <td className="py-3 px-3 text-slate-900">{item.inspectionQuantity}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspection Result Summary */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h3 className="text-lg font-bold text-slate-900 mb-4">C. Inspection Result Summary</h3>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-slate-700">1. Shipper Carton Packaging</span>
            <span className="font-medium text-blue-600">
              {formData.shipperCartonRemark ? `Remark Code: ${formData.shipperCartonRemark}` : 'No remark'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-slate-700">2. Inner Carton Packaging</span>
            <span className="font-medium text-blue-600">
              {formData.innerCartonRemark ? `Remark Code: ${formData.innerCartonRemark}` : 'No remark'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-slate-700">3. Retail Packaging</span>
            <span className="font-medium text-blue-600">
              {formData.retailPackagingRemark ? `Remark Code: ${formData.retailPackagingRemark}` : 'No remark'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-slate-700">4. Product Type (style, size, color, construction, material, marking, labeling)</span>
            <span className="font-medium text-blue-600">
              {formData.productTypeRemark ? `Remark Code: ${formData.productTypeRemark}` : 'No remark'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-slate-700">5. AQL (Workmanship / Appearance / Function)</span>
            <span className="font-medium text-blue-600">
              {formData.aqlWorkmanshipRemark ? `Remark Code: ${formData.aqlWorkmanshipRemark}` : 'No remark'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-700">6. On-site Tests</span>
            <span className="font-medium text-blue-600">
              {formData.onSiteTestsRemark ? `Remark Code: ${formData.onSiteTestsRemark}` : 'No remark'}
            </span>
          </div>
        </div>

        {/* Remark Analysis Summary */}
        <div className="bg-slate-50 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-slate-900 mb-3">Remark Analysis:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">{overallResult.totalRemarks}</div>
              <div className="text-sm text-slate-600">Total Remarks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{overallResult.average.toFixed(1)}</div>
              <div className="text-sm text-slate-600">Average Score</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${overallResult.status === 'PASS' ? 'text-emerald-600' :
                overallResult.status === 'RE-INSPECTION' ? 'text-amber-600' : 'text-red-600'
                }`}>
                {overallResult.status}
              </div>
              <div className="text-sm text-slate-600">Result</div>
            </div>
          </div>

          {/* Detailed Remark Breakdown */}
          {overallResult.remarkDetails.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-slate-700 mb-2">Remark Details:</h5>
              <div className="space-y-1">
                {overallResult.remarkDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-slate-600">{detail.category}:</span>
                    <span className="font-medium text-blue-600">Code {detail.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          Quality Metrics (AQL Summary)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">{formData.criticalDefects}/{formData.maxAllowedCritical}</div>
            <div className="text-slate-600 text-sm">Critical Defects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">{formData.majorDefects}/{formData.maxAllowedMajor}</div>
            <div className="text-slate-600 text-sm">Major Defects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 mb-1">{formData.minorDefects}/{formData.maxAllowedMinor}</div>
            <div className="text-slate-600 text-sm">Minor Defects</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${formData.criticalDefects <= formData.maxAllowedCritical &&
              formData.majorDefects <= formData.maxAllowedMajor &&
              formData.minorDefects <= formData.maxAllowedMinor ? "text-emerald-600" : "text-red-600"
              }`}>
              {formData.criticalDefects <= formData.maxAllowedCritical &&
                formData.majorDefects <= formData.maxAllowedMajor &&
                formData.minorDefects <= formData.maxAllowedMinor ? "PASS" : "FAIL"}
            </div>
            <div className="text-slate-600 text-sm">AQL Result</div>
          </div>
        </div>
      </div>

      {/* Overall Result - Based on Remark Code Average */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-300">
        <h3 className="text-lg font-bold text-slate-900 mb-4">OVERALL RESULT:</h3>
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-slate-700 mb-2">Scoring System:</h4>
          <div className="text-sm text-slate-600 space-y-1">
            <div>• Average 8-10: <span className="font-medium text-emerald-600">PASS</span></div>
            <div>• Average 6-8: <span className="font-medium text-amber-600">RE-INSPECTION</span></div>
            <div>• Average below 6: <span className="font-medium text-red-600">REJECTED</span></div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="overallResult"
              checked={overallResult.status === 'PASS'}
              readOnly
              className="w-5 h-5"
            />
            <span className="text-slate-700 font-medium">PASS (Average: {overallResult.average.toFixed(1)})</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="overallResult"
              checked={overallResult.status === 'RE-INSPECTION'}
              readOnly
              className="w-5 h-5"
            />
            <span className="text-slate-700 font-medium">RE-INSPECTION (Average: {overallResult.average.toFixed(1)})</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="overallResult"
              checked={overallResult.status === 'REJECTED'}
              readOnly
              className="w-5 h-5"
            />
            <span className="text-slate-700 font-medium">REJECTED (Average: {overallResult.average.toFixed(1)})</span>
          </label>
        </div>

        {overallResult.remarkCodes.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">
              Remark Codes: {overallResult.remarkCodes.join(', ')}
              (Total: {overallResult.totalRemarks}, Average: {overallResult.average.toFixed(1)})
            </span>
          </div>
        )}
      </div>

      {/* Final Status Display */}
      <div
        className={`p-6 rounded-xl text-center border-2 ${overallResult.status === 'PASS'
          ? "bg-emerald-50 border-emerald-200"
          : overallResult.status === 'REJECTED'
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
          }`}
      >
        <div className="flex items-center justify-center gap-3 mb-2">
          {overallResult.status === 'PASS' ? (
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          ) : overallResult.status === 'REJECTED' ? (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          )}
          <p
            className={`font-bold text-2xl ${overallResult.status === 'PASS'
              ? "text-emerald-800"
              : overallResult.status === 'REJECTED'
                ? "text-red-800"
                : "text-amber-800"
              }`}
          >
            {overallResult.status === 'PASS'
              ? "INSPECTION PASSED ✓"
              : overallResult.status === 'REJECTED'
                ? "INSPECTION REJECTED ✗"
                : "RE-INSPECTION REQUIRED ⚠️"}
          </p>
        </div>
        <p className="text-slate-600 mb-2">
          {overallResult.description}
        </p>
        <div className="text-sm text-slate-500">
          Average Score: {overallResult.average.toFixed(1)}/10
          {overallResult.totalRemarks > 0 && ` (${overallResult.totalRemarks} remarks)`}
        </div>
      </div>
    </div>
  )
}