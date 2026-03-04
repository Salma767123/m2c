"use client"

import { useState, useEffect } from "react"
import { Eye, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Factory } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/UI/Table"
import { Badge } from "@/components/UI/Badge"
import qcCheckerService from "@/services/qcCheckerService"

export default function ReportsPage() {
  const router = useRouter()
  const [inspections, setInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const res = await qcCheckerService.getInspections()
        if (res.success) {
          // Only show COMPLETED inspections as submitted reports
          const completed = (res.inspections || []).filter(
            (insp: any) => insp.status === "COMPLETED"
          )
          setInspections(completed)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load reports")
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const getResultBadge = (result: string) => {
    switch (result) {
      case "PASSED":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Passed</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
      case "CONDITIONALLY_PASSED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Conditional</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700">{result || "—"}</Badge>
    }
  }

  // Build display data from the real inspection + its formData (itemsToInspect)
  const buildRow = (insp: any) => {
    const fd = insp.itemsToInspect && !Array.isArray(insp.itemsToInspect) ? insp.itemsToInspect : {}
    return {
      id: insp.id,
      vendor: insp.vendor?.companyName || fd.vendorName || "—",
      poNumber: insp.poNumber || "—",
      factoryName: fd.factoryName || "—",
      inspectionDate: insp.completedAt
        ? new Date(insp.completedAt).toLocaleDateString("en-IN")
        : insp.scheduledDate || "—",
      result: insp.result || "—",
      inspectorName: fd.inspectorName || insp.checker?.name || "—",
      clientName: insp.clientName || "—",
    }
  }

  return (
    <div className="p-8 font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Inspection Reports</h1>
          <p className="text-slate-600 text-lg">Your completed factory quality control reports</p>
        </div>
        <span className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-semibold">
          {inspections.length} Report{inspections.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Completed Inspections</h2>
            <p className="text-sm text-slate-600">Factory inspection reports you have submitted</p>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-slate-500 text-sm">Loading your reports...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-slate-600">{error}</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="p-4 bg-slate-100 rounded-2xl">
                <Factory className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No reports yet</h3>
              <p className="text-slate-500 text-sm">
                Completed factory inspections will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-700">Vendor</TableHead>
                  <TableHead className="font-semibold text-slate-700">Factory</TableHead>
                  <TableHead className="font-semibold text-slate-700">PO Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">Client</TableHead>
                  <TableHead className="font-semibold text-slate-700">Completed On</TableHead>
                  <TableHead className="font-semibold text-slate-700">Result</TableHead>
                  <TableHead className="font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((insp) => {
                  const row = buildRow(insp)
                  return (
                    <TableRow key={insp.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{row.vendor}</div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{row.factoryName}</TableCell>
                      <TableCell>
                        {row.poNumber !== "—" ? (
                          <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                            {row.poNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{row.clientName}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{row.inspectionDate}</TableCell>
                      <TableCell>{getResultBadge(row.result)}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/checker/dashboard/report/${insp.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          title="View Report"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Report
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
