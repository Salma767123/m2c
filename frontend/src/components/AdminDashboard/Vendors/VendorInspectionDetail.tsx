"use client";

import { useState } from "react";
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, Calendar, CheckCircle, XCircle, FileText, Package, ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { Badge } from "../../UI/Badge";

interface InspectionItem {
  id: number;
  itemName: string;
  itemDescription: string;
  poQuantity: number;
  inspectedQuantity: number;
  status: string;
}

interface Measurement {
  sampleName: string;
  cartonLength: number;
  cartonWidth: number;
  cartonHeight: number;
  productLength: number;
  productWidth: number;
  retailWeight: number;
  cartonGrossWeight: number;
  status: string;
}

interface InspectionReport {
  id: string;
  date: string;
  checkerName: string;
  status: "PASSED" | "FAILED" | "PENDING";
  po: string;
  client: string;
  factory: string;
  serviceLocation: string;
  cartons: number;
  items: InspectionItem[];
  packaging: {
    shipperCartonQuality: string[];
    retailPackagingQuality: string[];
    internalProtection: string[];
    labelingComplete: string[];
  };
  measurements: Measurement[];
  defects: {
    majorDefects: number;
    minorDefects: number;
    majorDefectDetails: string;
    minorDefectDetails: string;
  };
  testing: {
    dropTestResult: string;
    colorFastnessDry: string;
    colorFastnessWet: string;
    seamStrengthResult: string;
    smellCheck: string;
  };
}

interface VendorInspection {
  vendorId: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  assignedChecker: string;
  assignedCheckerName: string;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  lastInspectionDate: string;
  inspectionReports: InspectionReport[];
}

export default function VendorInspectionDetail({ vendorId }: { vendorId: string }) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  
  // Mock data - replace with actual API call
  const [vendorData] = useState<VendorInspection>({
    vendorId: vendorId,
    companyName: "Nav Nit Group of Textiles",
    ownerName: "John Doe",
    email: "john@textile.com",
    phone: "+1 234-567-8900",
    address: "123 Textile Street, Manufacturing District, TX 75001",
    assignedChecker: "1",
    assignedCheckerName: "John Smith",
    totalInspections: 3,
    passedInspections: 2,
    failedInspections: 1,
    lastInspectionDate: "2024-02-08",
    inspectionReports: [
      {
        id: "1",
        date: "2024-02-08",
        checkerName: "John Smith",
        status: "PASSED",
        po: "PO-2024-001",
        client: "Fashion Forward Inc.",
        factory: "Nav Nit Manufacturing Unit 1",
        serviceLocation: "Chennai, Tamil Nadu",
        cartons: 50,
        items: [
          {
            id: 1,
            itemName: "Cotton T-Shirt",
            itemDescription: "100% Cotton Round Neck T-Shirt - Various Colors",
            poQuantity: 2500,
            inspectedQuantity: 200,
            status: "PASSED"
          },
          {
            id: 2,
            itemName: "Denim Jeans",
            itemDescription: "Blue Denim Straight Fit Jeans - Size 28-42",
            poQuantity: 2500,
            inspectedQuantity: 200,
            status: "PASSED"
          }
        ],
        packaging: {
          shipperCartonQuality: ["pass"],
          retailPackagingQuality: ["pass"],
          internalProtection: ["pass"],
          labelingComplete: ["pass"]
        },
        measurements: [
          {
            sampleName: "S1",
            cartonLength: 45.0,
            cartonWidth: 30.0,
            cartonHeight: 25.0,
            productLength: 45.0,
            productWidth: 30.0,
            retailWeight: 0.5,
            cartonGrossWeight: 25.0,
            status: "PASSED"
          },
          {
            sampleName: "S2",
            cartonLength: 45.1,
            cartonWidth: 30.1,
            cartonHeight: 25.0,
            productLength: 45.1,
            productWidth: 30.1,
            retailWeight: 0.51,
            cartonGrossWeight: 25.2,
            status: "PASSED"
          }
        ],
        defects: {
          majorDefects: 0,
          minorDefects: 2,
          majorDefectDetails: "",
          minorDefectDetails: "Minor stitching irregularities on 2 samples"
        },
        testing: {
          dropTestResult: "pass",
          colorFastnessDry: "pass",
          colorFastnessWet: "pass",
          seamStrengthResult: "pass",
          smellCheck: "pass"
        }
      },
      {
        id: "2",
        date: "2024-01-25",
        checkerName: "John Smith",
        status: "PASSED",
        po: "PO-2024-002",
        client: "Fashion Forward Inc.",
        factory: "Nav Nit Manufacturing Unit 1",
        serviceLocation: "Chennai, Tamil Nadu",
        cartons: 40,
        items: [
          {
            id: 1,
            itemName: "Polo Shirt",
            itemDescription: "Cotton Polo Shirt - Multiple Colors",
            poQuantity: 1500,
            inspectedQuantity: 150,
            status: "PASSED"
          }
        ],
        packaging: {
          shipperCartonQuality: ["pass"],
          retailPackagingQuality: ["pass"],
          internalProtection: ["pass"],
          labelingComplete: ["pass"]
        },
        measurements: [
          {
            sampleName: "S1",
            cartonLength: 40.0,
            cartonWidth: 28.0,
            cartonHeight: 22.0,
            productLength: 40.0,
            productWidth: 28.0,
            retailWeight: 0.45,
            cartonGrossWeight: 20.0,
            status: "PASSED"
          }
        ],
        defects: {
          majorDefects: 0,
          minorDefects: 1,
          majorDefectDetails: "",
          minorDefectDetails: "Minor color variation on 1 sample"
        },
        testing: {
          dropTestResult: "pass",
          colorFastnessDry: "pass",
          colorFastnessWet: "pass",
          seamStrengthResult: "pass",
          smellCheck: "pass"
        }
      },
      {
        id: "3",
        date: "2024-01-10",
        checkerName: "Sarah Johnson",
        status: "FAILED",
        po: "PO-2024-003",
        client: "Fashion Forward Inc.",
        factory: "Nav Nit Manufacturing Unit 2",
        serviceLocation: "Chennai, Tamil Nadu",
        cartons: 60,
        items: [
          {
            id: 1,
            itemName: "Casual Shirt",
            itemDescription: "Cotton Casual Shirt - Checkered Pattern",
            poQuantity: 2000,
            inspectedQuantity: 180,
            status: "FAILED"
          }
        ],
        packaging: {
          shipperCartonQuality: ["pass"],
          retailPackagingQuality: ["fail"],
          internalProtection: ["pass"],
          labelingComplete: ["fail"]
        },
        measurements: [
          {
            sampleName: "S1",
            cartonLength: 42.0,
            cartonWidth: 29.0,
            cartonHeight: 24.0,
            productLength: 42.0,
            productWidth: 29.0,
            retailWeight: 0.48,
            cartonGrossWeight: 23.0,
            status: "FAILED"
          }
        ],
        defects: {
          majorDefects: 5,
          minorDefects: 8,
          majorDefectDetails: "Significant color bleeding, button quality issues",
          minorDefectDetails: "Loose threads, minor stitching irregularities"
        },
        testing: {
          dropTestResult: "pass",
          colorFastnessDry: "fail",
          colorFastnessWet: "fail",
          seamStrengthResult: "pass",
          smellCheck: "pass"
        }
      }
    ],
  });

  const getStatusBadge = (status: string) => {
    const config = {
      PASSED: { variant: "default" as const, className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
      FAILED: { variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200" },
      PENDING: { variant: "secondary" as const, className: "bg-amber-100 text-amber-800 border-amber-200" },
    };
    return config[status as keyof typeof config] || config.PENDING;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "passed":
      case "pass":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "failed":
      case "fail":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  const passRate = vendorData.totalInspections > 0 
    ? ((vendorData.passedInspections / vendorData.totalInspections) * 100).toFixed(1)
    : 0;

  const selectedReportData = selectedReport 
    ? vendorData.inspectionReports.find(r => r.id === selectedReport)
    : null;

  return (
    <div className="p-6">
      <Breadcrumb />
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/dashboard/vendors/assign-qc"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Inspection Details</h1>
          <p className="text-gray-600 mt-1">Quality control inspection history and reports</p>
        </div>
      </div>

      {/* Vendor Information */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Building2 className="h-8 w-8 text-gray-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{vendorData.companyName}</h2>
              <p className="text-gray-600">{vendorData.ownerName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{vendorData.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{vendorData.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 md:col-span-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{vendorData.address}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <ClipboardCheck className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Assigned Checker: <span className="font-medium">{vendorData.assignedCheckerName}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Last Inspection: <span className="font-medium">{new Date(vendorData.lastInspectionDate).toLocaleDateString()}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Inspections</div>
            <div className="text-2xl font-bold text-gray-900">{vendorData.totalInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Passed</div>
            <div className="text-2xl font-bold text-green-600">{vendorData.passedInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{vendorData.failedInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Pass Rate</div>
            <div className="text-2xl font-bold text-blue-600">{passRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection Reports List */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inspection History</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Cartons</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorData.inspectionReports.map((report) => {
                const badgeConfig = getStatusBadge(report.status);
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        {report.po}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{report.checkerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-900">{report.cartons}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{report.items.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeConfig.variant} className={badgeConfig.className}>
                        {getStatusIcon(report.status)}
                        <span className="ml-1">{report.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedReport(report.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Report View */}
      {selectedReportData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Inspection Report Details</h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium"
            >
              Hide Details
            </button>
          </div>

          {/* Report Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">General Information</h3>
                      <p className="text-sm text-gray-600">Basic inspection details</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Vendor</label>
                        <p className="text-gray-900 font-medium">{vendorData.companyName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">PO Number</label>
                        <p className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 inline-block">
                          {selectedReportData.po}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Factory</label>
                        <p className="text-gray-900">{selectedReportData.factory}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Client</label>
                        <p className="text-gray-900 font-medium">{selectedReportData.client}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Service Location</label>
                        <p className="text-gray-900">{selectedReportData.serviceLocation}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Inspector</label>
                        <p className="text-gray-900">{selectedReportData.checkerName}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Inspection Status</h3>
                    <p className="text-sm text-gray-600">Overall result</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge 
                      variant={getStatusBadge(selectedReportData.status).variant}
                      className={`${getStatusBadge(selectedReportData.status).className} text-lg px-4 py-2`}
                    >
                      {getStatusIcon(selectedReportData.status)}
                      <span className="ml-2">{selectedReportData.status}</span>
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-gray-900">{selectedReportData.cartons}</p>
                      <p className="text-sm text-gray-600">Cartons</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-gray-900">{selectedReportData.items.length}</p>
                      <p className="text-sm text-gray-600">Items</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Inspection Date</p>
                    <p className="font-medium text-gray-900">{selectedReportData.date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Inspected */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Items Inspected</h3>
                  <p className="text-sm text-gray-600">Product details and quantities</p>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>PO Quantity</TableHead>
                    <TableHead>Inspected</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReportData.items.map((item) => {
                    const itemBadgeConfig = getStatusBadge(item.status);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-gray-600">{item.itemDescription}</TableCell>
                        <TableCell>{item.poQuantity.toLocaleString()}</TableCell>
                        <TableCell>{item.inspectedQuantity}</TableCell>
                        <TableCell>
                          <Badge variant={itemBadgeConfig.variant} className={itemBadgeConfig.className}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inspection Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Packaging Results */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Packaging & Labeling</h3>
                <div className="space-y-3">
                  {Object.entries(selectedReportData.packaging).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(Array.isArray(value) ? value[0] : value)}
                        <span className="text-sm font-medium capitalize">
                          {Array.isArray(value) ? value.join(', ') : value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Testing Results */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quality Testing</h3>
                <div className="space-y-3">
                  {Object.entries(selectedReportData.testing).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, (match) => ` ${match}`).trim()}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value)}
                        <span className="text-sm font-medium capitalize">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Measurements */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Physical Measurements</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample</TableHead>
                    <TableHead>Carton L/W/H (cm)</TableHead>
                    <TableHead>Product L/W (cm)</TableHead>
                    <TableHead>Retail Weight (kg)</TableHead>
                    <TableHead>Gross Weight (kg)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReportData.measurements.map((measurement, index) => {
                    const measurementBadgeConfig = getStatusBadge(measurement.status);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{measurement.sampleName}</TableCell>
                        <TableCell>
                          {measurement.cartonLength} × {measurement.cartonWidth} × {measurement.cartonHeight}
                        </TableCell>
                        <TableCell>
                          {measurement.productLength} × {measurement.productWidth}
                        </TableCell>
                        <TableCell>{measurement.retailWeight}</TableCell>
                        <TableCell>{measurement.cartonGrossWeight}</TableCell>
                        <TableCell>
                          <Badge variant={measurementBadgeConfig.variant} className={measurementBadgeConfig.className}>
                            {getStatusIcon(measurement.status)}
                            <span className="ml-1">{measurement.status}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Defects Summary */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AQL Defects Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-red-800">Major Defects</span>
                    <span className="text-2xl font-bold text-red-600">{selectedReportData.defects.majorDefects}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="font-medium text-amber-800">Minor Defects</span>
                    <span className="text-2xl font-bold text-amber-600">{selectedReportData.defects.minorDefects}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {selectedReportData.defects.majorDefectDetails && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Major Defect Details</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReportData.defects.majorDefectDetails}</p>
                    </div>
                  )}
                  {selectedReportData.defects.minorDefectDetails && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Minor Defect Details</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedReportData.defects.minorDefectDetails}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
