"use client";

import { useState, useEffect } from "react";
import { Search, UserCheck, Building2, Mail, Phone, CheckCircle, Plus, Package, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

interface Vendor {
  id: string;
  vendorCode: string | null;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: string;
  assignedChecker: string | null;
  assignedCheckerName: string | null;
  inspectionStatus: string | null;
}

interface QCChecker {
  id: string;
  name: string;
  assignedVendors: number;
}

import vendorService from '@/services/vendorService';
import qcCheckerService from '@/services/qcCheckerService';

export default function AssignQCChecker() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [qcCheckers, setQcCheckers] = useState<QCChecker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vendorListResponse, checkersResponse] = await Promise.all([
          vendorService.getAllVendors({ limit: 100 }),
          qcCheckerService.getAllQCCheckers(),
        ]);

        const AllVendors = vendorListResponse.vendors.map((v: any) => ({
          id: v.id,
          vendorCode: v.vendorCode || null,
          companyName: v.companyName,
          ownerName: v.ownerName,
          email: v.email,
          phone: v.businessPhone,
          status: v.status,
          assignedChecker: v.assignedQcId || null,
          assignedCheckerName: v.assignedQc?.name || null,
          inspectionStatus: v.latestInspection?.status || null,
        }));
        setVendors(AllVendors);

        if (checkersResponse.success) {
          setQcCheckers(checkersResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterVendorStatus, setFilterVendorStatus] = useState<string>("all");

  const filteredVendors = vendors.filter((vendor) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      vendor.companyName.toLowerCase().includes(q) ||
      vendor.ownerName.toLowerCase().includes(q) ||
      vendor.email.toLowerCase().includes(q) ||
      (vendor.vendorCode?.toLowerCase().includes(q) ?? false);

    const matchesAssignmentFilter =
      filterStatus === "all" ||
      (filterStatus === "assigned" && vendor.assignedChecker) ||
      (filterStatus === "unassigned" && !vendor.assignedChecker);

    const matchesVendorStatusFilter =
      filterVendorStatus === "all" || vendor.status === filterVendorStatus;

    return matchesSearch && matchesAssignmentFilter && matchesVendorStatusFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const totalAssigned = vendors.filter((v) => v.assignedChecker).length;
  const totalUnassigned = vendors.filter((v) => !v.assignedChecker).length;

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign QC Checker to Vendors</h1>
          <p className="text-gray-600 mt-1">Manage QC checker assignments for vendor quality control</p>
        </div>
        <Link
          href="/admin/dashboard/vendors/assign-qc-checker/add"
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Assignment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Vendors</div>
            <div className="text-2xl font-bold text-gray-900">{vendors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Assigned</div>
            <div className="text-2xl font-bold text-green-600">{totalAssigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Unassigned</div>
            <div className="text-2xl font-bold text-orange-600">{totalUnassigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Available Checkers</div>
            <div className="text-2xl font-bold text-blue-600">{qcCheckers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
              <input
                type="text"
                placeholder="Search by company name, owner, email, or vendor code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:w-48">
                <Dropdown
                  value={filterStatus}
                  options={[
                    { value: "all", label: "All Vendors" },
                    { value: "assigned", label: "Assigned" },
                    { value: "unassigned", label: "Unassigned" },
                  ]}
                  onChange={(val) => setFilterStatus(val as string)}
                  placeholder="Filter by assignment"
                />
              </div>
              <div className="w-full sm:w-48">
                <Dropdown
                  value={filterVendorStatus}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "APPROVED", label: "Approved" },
                    { value: "PENDING", label: "Pending" },
                    { value: "REJECTED", label: "Rejected" },
                  ]}
                  onChange={(val) => setFilterVendorStatus(val as string)}
                  placeholder="Filter by status"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned QC Checker</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors.length > 0 ? (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{vendor.companyName}</div>
                        <div className="text-sm text-gray-500">{vendor.ownerName}</div>
                        {vendor.vendorCode && (
                          <div className="text-xs font-mono text-gray-400 mt-0.5">{vendor.vendorCode}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        {vendor.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {vendor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell>
                    {vendor.assignedCheckerName ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {vendor.assignedCheckerName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Inspection Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {vendor.inspectionStatus === "COMPLETED" ? (
                        <Link
                          href={`/admin/dashboard/vendors/inspection/${vendor.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          View Report
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/dashboard/vendors/assign-qc-checker/add?vendorId=${vendor.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <UserCheck className="h-4 w-4" />
                          {vendor.assignedChecker ? "Update" : "Assign"}
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No vendors found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
