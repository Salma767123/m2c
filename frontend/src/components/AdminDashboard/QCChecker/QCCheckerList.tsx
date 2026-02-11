"use client";

import { useState } from "react";
import { Search, Eye, Edit, Trash2, UserPlus, Mail, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../UI/Table";
import Dropdown from "../../UI/Dropdown";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";

interface QCChecker {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
  assignedVendors: number;
  completedInspections: number;
  joinedDate: string;
  lastActive: string;
}

export default function QCCheckerList() {
  const [checkers] = useState<QCChecker[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      phone: "+1 234-567-8900",
      status: "active",
      assignedVendors: 12,
      completedInspections: 45,
      joinedDate: "2024-01-15",
      lastActive: "2024-02-10",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      phone: "+1 234-567-8901",
      status: "active",
      assignedVendors: 8,
      completedInspections: 32,
      joinedDate: "2024-01-20",
      lastActive: "2024-02-09",
    },
    {
      id: "3",
      name: "Michael Brown",
      email: "m.brown@example.com",
      phone: "+1 234-567-8902",
      status: "inactive",
      assignedVendors: 5,
      completedInspections: 18,
      joinedDate: "2023-12-10",
      lastActive: "2024-01-25",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredCheckers = checkers.filter((checker) => {
    const matchesSearch =
      checker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checker.phone.includes(searchTerm);
    const matchesFilter = filterStatus === "all" || checker.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalActive = checkers.filter((c) => c.status === "active").length;
  const totalInactive = checkers.filter((c) => c.status === "inactive").length;
  const totalInspections = checkers.reduce((sum, c) => sum + c.completedInspections, 0);

  return (
    <div className="p-6">
      <Breadcrumb />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QC Checker Management</h1>
          <p className="text-gray-600 mt-1">Manage quality control checkers and their assignments</p>
        </div>
        <Link
          href="/admin/dashboard/qc-checker/create"
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Add QC Checker
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Checkers</div>
            <div className="text-2xl font-bold text-gray-900">{checkers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-gray-600">{totalInactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Inspections</div>
            <div className="text-2xl font-bold text-blue-600">{totalInspections}</div>
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
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#222222] focus:border-transparent"
              />
            </div>
            <div className="w-full md:w-48">
              <Dropdown
                value={filterStatus}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "suspended", label: "Suspended" },
                ]}
                onChange={(val) => setFilterStatus(val as string)}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Checker Details</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Vendors</TableHead>
              <TableHead>Inspections</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCheckers.length > 0 ? (
              filteredCheckers.map((checker) => (
                <TableRow key={checker.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{checker.name}</div>
                      <div className="text-sm text-gray-500">ID: {checker.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-3 w-3 mr-1 text-gray-400" />
                        {checker.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-3 w-3 mr-1 text-gray-400" />
                        {checker.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(checker.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-gray-900">{checker.assignedVendors}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-blue-600">{checker.completedInspections}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      {new Date(checker.joinedDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {new Date(checker.lastActive).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Checker"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Checker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No QC checkers found</p>
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
