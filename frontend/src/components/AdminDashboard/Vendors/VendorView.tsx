'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  User,
  Package,
  Factory,
  Award,
  Calendar,
  Star,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import VendorService, { VendorProfile } from '@/services/vendorService'
import adminReviewService, { AdminOrderReview } from '@/services/adminReviewService'
import { toast } from '@/hooks/use-toast'
import RejectionModal from './RejectionModal'
import SuspensionModal from './SuspensionModal'
import { hasPermission } from '@/lib/auth'

interface VendorViewProps {
  vendorId: string
}

export default function VendorView({ vendorId }: VendorViewProps) {
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [rejectionModal, setRejectionModal] = useState(false)
  const [suspensionModal, setSuspensionModal] = useState(false)

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setLoading(true)
        // Use the new getVendorById method
        const response = await VendorService.getVendorById(vendorId)
        setVendor(response.vendor)
      } catch (error) {
        console.error('Error fetching vendor data:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch vendor details',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchVendorData()
  }, [vendorId])

  const handleApprove = async () => {
    if (!vendor) return

    try {
      setActionLoading('approve')
      await VendorService.approveVendor(vendor.id)

      setVendor({ ...vendor, status: 'APPROVED', approvedAt: new Date().toISOString() })
      toast({
        title: 'Success',
        description: 'Vendor approved successfully'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = () => {
    setRejectionModal(true)
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!vendor) return

    try {
      setActionLoading('reject')
      await VendorService.rejectVendor(vendor.id, reason)

      setVendor({ ...vendor, status: 'REJECTED', rejectedAt: new Date().toISOString(), rejectionReason: reason })
      toast({
        title: 'Success',
        description: 'Vendor rejected successfully'
      })
      setRejectionModal(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSuspend = () => {
    setSuspensionModal(true)
  }

  const handleSuspendConfirm = async (reason: string) => {
    if (!vendor) return

    try {
      setActionLoading('suspend')
      await VendorService.suspendVendor(vendor.id, reason)

      setVendor({ ...vendor, status: 'SUSPENDED', suspendedAt: new Date().toISOString(), rejectionReason: reason })
      toast({
        title: 'Success',
        description: 'Vendor suspended successfully'
      })
      setSuspensionModal(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to suspend vendor'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerifyBankDetails = async () => {
    if (!vendor) return

    try {
      setActionLoading('verify-bank')
      await VendorService.verifyVendorBankDetails(vendor.id)

      setVendor({
        ...vendor,
        bankDetails: {
          ...vendor.bankDetails,
          isVerified: true,
          verifiedAt: new Date().toISOString()
        } as any
      })
      toast({
        title: 'Success',
        description: 'Vendor bank details verified successfully'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify bank details'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">Loading vendor details...</p>
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vendor Not Found</h2>
          <p className="text-gray-600 mb-4">The vendor you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/admin/dashboard/vendors')}>
            Back to Vendors
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'details', label: 'Company Details', icon: FileText },
    { id: 'contact-trade', label: 'Contact & Trade', icon: Phone },
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'facilities', label: 'Facilities', icon: Factory },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'bank-details', label: 'Bank Details', icon: CreditCard },
    { id: 'performance', label: 'Performance', icon: Star },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin/dashboard/vendors')}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vendor.companyName}</h1>
                <p className="text-gray-600">
                  Vendor Code: <span className="font-mono">{vendor.vendorCode || vendor.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {getStatusBadge(vendor.status)}

              {/* Action Buttons */}
              {vendor.status === 'PENDING' && hasPermission('edit_vendors') && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading === 'approve'}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {actionLoading === 'approve' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading === 'reject'}
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    {actionLoading === 'reject' ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                </>
              )}

              {vendor.status === 'APPROVED' && hasPermission('edit_vendors') && (
                <Button
                  onClick={handleSuspend}
                  disabled={actionLoading === 'suspend'}
                  variant="outline"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  {actionLoading === 'suspend' ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Suspend
                    </>
                  )}
                </Button>
              )}

              {hasPermission('edit_vendors') && (
                <Button
                  onClick={() => router.push(`/admin/dashboard/vendors/edit/${vendor.id}`)}
                  className="bg-[#313131] text-white hover:bg-[#222222]"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vendor
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-[#313131] text-[#313131]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab vendor={vendor} />}
        {activeTab === 'details' && <DetailsTab vendor={vendor} />}
        {activeTab === 'contact-trade' && <ContactTradeTab vendor={vendor} />}
        {activeTab === 'products' && <ProductsTab vendor={vendor} />}
        {activeTab === 'facilities' && <FacilitiesTab vendor={vendor} />}
        {activeTab === 'documents' && <DocumentsTab vendor={vendor} />}
        {activeTab === 'performance' && <PerformanceTab vendor={vendor} />}
        {activeTab === 'bank-details' && <BankDetailsTab vendor={vendor} onVerify={handleVerifyBankDetails} loading={actionLoading === 'verify-bank'} />}
        {activeTab === 'reviews' && <ReviewsTab vendor={vendor} />}
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal}
        onClose={() => setRejectionModal(false)}
        onConfirm={handleRejectConfirm}
        vendor={{
          id: vendor.id,
          companyName: vendor.companyName,
          ownerName: vendor.ownerName,
          email: vendor.email
        }}
        isLoading={actionLoading === 'reject'}
      />

      {/* Suspension Modal */}
      <SuspensionModal
        isOpen={suspensionModal}
        onClose={() => setSuspensionModal(false)}
        onConfirm={handleSuspendConfirm}
        vendor={{
          id: vendor.id,
          companyName: vendor.companyName,
          ownerName: vendor.ownerName,
          email: vendor.email,
          status: vendor.status
        }}
        isLoading={actionLoading === 'suspend'}
      />
    </div>
  )
}

// Tab Components
function OverviewTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Info */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Business Email</p>
                    <p className="font-medium">{vendor.businessEmail || vendor.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Business Phone</p>
                    <p className="font-medium">{vendor.businessPhone}</p>
                  </div>
                </div>

                {vendor.gstNumber && (
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">GST Number</p>
                      <p className="font-medium">{vendor.gstNumber}</p>
                    </div>
                  </div>
                )}

                {vendor.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Website</p>
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        {vendor.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{vendor.businessCity}, {vendor.businessState}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Join Date</p>
                    <p className="font-medium">{new Date(vendor.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {vendor.establishedYear && (
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Established</p>
                      <p className="font-medium">{vendor.establishedYear}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Owner Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{vendor.ownerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{vendor.ownerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{vendor.ownerPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Vendor Type</p>
                <p className="font-medium capitalize">{vendor.vendorType.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Company Logo */}
        {vendor.companyLogo && (
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <img
                  src={vendor.companyLogo}
                  alt={`${vendor.companyName} Logo`}
                  className="w-32 h-32 object-contain border border-gray-200 rounded-lg"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Product Categories</span>
              <span className="font-semibold">{vendor.productCategories?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Specializations</span>
              <span className="font-semibold">{vendor.specializations?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Certifications</span>
              <span className="font-semibold">{vendor._count?.certifications || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Documents</span>
              <span className="font-semibold">{vendor._count?.documents || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle>Status Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Status</span>
              <span className="font-semibold capitalize">{vendor.status.toLowerCase()}</span>
            </div>

            {vendor.approvedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Approved Date</span>
                <span className="font-semibold">{new Date(vendor.approvedAt).toLocaleDateString()}</span>
              </div>
            )}

            {vendor.rejectedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rejected Date</span>
                <span className="font-semibold">{new Date(vendor.rejectedAt).toLocaleDateString()}</span>
              </div>
            )}

            {vendor.suspendedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Suspended Date</span>
                <span className="font-semibold">{new Date(vendor.suspendedAt).toLocaleDateString()}</span>
              </div>
            )}

            {vendor.rejectionReason && (
              <div>
                <p className="text-sm text-gray-600">Reason</p>
                <p className="font-medium text-red-600">{vendor.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  )
}

function DetailsTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p>{vendor.businessAddress}</p>
            <p>{vendor.businessCity}, {vendor.businessState} {vendor.businessZipCode}</p>
            <p>{vendor.businessCountry}</p>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse & Map Details */}
      {(vendor.warehouseAddress || vendor.mapLink) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Warehouse & Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendor.warehouseAddress ? (
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-1">Warehouse Address</p>
                  <p className="font-medium">{vendor.warehouseAddress}</p>
                  <p className="font-medium">
                    {vendor.warehouseCity}, {vendor.warehouseState} {vendor.warehouseZipCode}
                  </p>
                  {vendor.warehouseCountry && <p className="font-medium">{vendor.warehouseCountry}</p>}
                </div>
              ) : (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-200">
                  No separate warehouse address provided. Using business location.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendor.warehouseSize && (
                  <div>
                    <p className="text-sm text-gray-600">Warehouse Size</p>
                    <p className="font-medium">{vendor.warehouseSize}</p>
                  </div>
                )}
                {vendor.storageCapacity && (
                  <div>
                    <p className="text-sm text-gray-600">Storage Capacity</p>
                    <p className="font-medium">{vendor.storageCapacity}</p>
                  </div>
                )}
              </div>

              {/* Google Map Display */}
              {vendor.mapLink && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-3 font-semibold">Location Map</p>
                  {vendor.mapLink.includes('google.com/maps/embed') || vendor.mapLink.includes('maps.google.com/maps/embed') ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        src={vendor.mapLink}
                        width="100%"
                        height="400"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Warehouse Location"
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                      <Globe className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center mb-4">
                        A location link is provided but it's not a direct map embed.
                      </p>
                      <Button asChild variant="outline">
                        <a href={vendor.mapLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Google Maps
                        </a>
                      </Button>
                    </div>
                  )}
                  <div className="mt-2 text-right">
                    <a
                      href={vendor.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Open Full Map in New Tab
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProductsTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className="bg-blue-100 text-blue-800 capitalize">
            {vendor.vendorType.replace('_', ' ')}
          </Badge>
        </CardContent>
      </Card>

      {vendor.productCategories && vendor.productCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(vendor.productCategories)).map((category, index) => (
                <Badge key={`${category}-${index}`} className="bg-green-100 text-green-800 capitalize">
                  {category}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {vendor.specializations && vendor.specializations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {vendor.specializations.map((spec, index) => (
                <Badge key={index} className="bg-purple-100 text-purple-800">
                  {spec}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {vendor.productTypes && vendor.productTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(vendor.productTypes)).map((type, index) => (
                <Badge key={`${type}-${index}`} className="bg-indigo-100 text-indigo-800">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FacilitiesTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="space-y-6">
      {vendor.factoryAddress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Factory className="h-5 w-5" />
              <span>Manufacturing Facilities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Factory Address</p>
                <p className="font-medium">{vendor.factoryAddress}</p>
                <p className="font-medium">{vendor.factoryCity}, {vendor.factoryState}</p>
              </div>
              {vendor.factorySize && (
                <div>
                  <p className="text-sm text-gray-600">Factory Size</p>
                  <p className="font-medium">{vendor.factorySize}</p>
                </div>
              )}
              {vendor.productionCapacity && (
                <div>
                  <p className="text-sm text-gray-600">Production Capacity</p>
                  <p className="font-medium">{vendor.productionCapacity}</p>
                </div>
              )}
              {vendor.qualityControl && (
                <div>
                  <p className="text-sm text-gray-600">Quality Control</p>
                  <p className="font-medium">{vendor.qualityControl}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {vendor.certifications && vendor.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendor.certifications.map((cert, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Award className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-gray-600">Issued by: {cert.issuedBy}</p>
                      {cert.expiryDate && (
                        <p className="text-xs text-gray-500">Expires: {new Date(cert.expiryDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  {cert.documentUrl && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={cert.documentUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={cert.documentUrl} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {vendor.shippingMethods && vendor.shippingMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logistics & Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm text-gray-600 mb-2">Shipping Methods</p>
              <div className="flex flex-wrap gap-2">
                {vendor.shippingMethods.map((method, index) => (
                  <Badge key={index} className="bg-indigo-100 text-indigo-800">
                    {method}
                  </Badge>
                ))}
              </div>
            </div>

            {vendor.deliveryTime && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Delivery Time</p>
                <p className="font-medium">{vendor.deliveryTime}</p>
              </div>
            )}

            {vendor.minimumOrderQuantity && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Minimum Order Quantity</p>
                <p className="font-medium">{vendor.minimumOrderQuantity}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DocumentsTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {vendor.documents && vendor.documents.length > 0 ? (
          <div className="space-y-4">
            {vendor.documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="font-medium">{doc.type}</p>
                    <p className="text-sm text-gray-600">{doc.name}</p>
                    <p className="text-xs text-gray-500">Uploaded: {new Date(doc.createdAt || doc.uploadDate).toLocaleDateString()}</p>
                  </div>
                </div>
                {doc.documentUrl && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No documents uploaded yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function BankDetailsTab({ vendor, onVerify, loading }: { vendor: VendorProfile, onVerify?: () => void, loading?: boolean }) {
  // Check if bank details strictly exist either as an object or as a nested object
  // Based on the VendorProfile interface, it's bankDetails?: any
  // But often it might be nested or direct properties

  const bankDetails = vendor.bankDetails

  if (!bankDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Bank Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No bank details available for this vendor.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Bank Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Account Holder Name</p>
              <p className="font-medium text-lg">{bankDetails.accountHolderName || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Bank Name</p>
              <p className="font-medium">{bankDetails.bankName || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Account Number</p>
              <p className="font-medium font-mono">{bankDetails.accountNumber || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">IFSC / Swift Code</p>
              <p className="font-medium">{bankDetails.ifscCode || bankDetails.swiftCode || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Account Type</p>
              <p className="font-medium capitalize">{bankDetails.accountType || 'N/A'}</p>
            </div>

            {(bankDetails.branchName || bankDetails.branchAddress) && (
              <div>
                <p className="text-sm text-gray-600">Branch Details</p>
                {bankDetails.branchName && <p className="font-medium">{bankDetails.branchName}</p>}
                {bankDetails.branchAddress && <p className="text-sm text-gray-800">{bankDetails.branchAddress}</p>}
              </div>
            )}
          </div>
        </div>

        {bankDetails.isVerified !== undefined && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Verification Status:</span>
              {bankDetails.isVerified ? (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Verified
                </Badge>
              ) : (
                <div className="flex items-center gap-4">
                  <Badge className="bg-yellow-100 text-yellow-800">Pending Verification</Badge>
                  {onVerify && hasPermission('edit_vendors') && (
                    <Button
                      size="sm"
                      onClick={onVerify}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : 'Verify Bank Details'}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {bankDetails.verifiedAt && (
              <p className="text-xs text-gray-500">
                Verified on {new Date(bankDetails.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ContactTradeTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="space-y-6">
      {/* Main Contact */}
      {vendor.mainContact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Main Contact Person</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{vendor.mainContact.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Designation</p>
                <p className="font-medium">{vendor.mainContact.designation || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email 1</p>
                <p className="font-medium">{vendor.mainContact.email1 || vendor.mainContact.email || 'N/A'}</p>
              </div>
              {vendor.mainContact.email2 && (
                <div>
                  <p className="text-sm text-gray-600">Email 2</p>
                  <p className="font-medium">{vendor.mainContact.email2}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Phone 1</p>
                <p className="font-medium">{vendor.mainContact.phone1 || vendor.mainContact.phone || 'N/A'}</p>
              </div>
              {vendor.mainContact.phone2 && (
                <div>
                  <p className="text-sm text-gray-600">Phone 2</p>
                  <p className="font-medium">{vendor.mainContact.phone2}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium capitalize">{vendor.mainContact.department || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternate Contacts */}
      {vendor.alternateContacts && vendor.alternateContacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Alternate Contacts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {vendor.alternateContacts.map((contact: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Contact {index + 1}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{contact.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Designation</p>
                      <p className="font-medium">{contact.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{contact.email1 || contact.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{contact.phone1 || contact.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium capitalize">{contact.department || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Trade Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendor.tradeLicenseNumber && (
              <div>
                <p className="text-sm text-gray-600">Trade License Number</p>
                <p className="font-medium">{vendor.tradeLicenseNumber}</p>
              </div>
            )}
            {vendor.businessRegistrationNumber && (
              <div>
                <p className="text-sm text-gray-600">Business Registration Number</p>
                <p className="font-medium">{vendor.businessRegistrationNumber}</p>
              </div>
            )}
            {vendor.taxIdentificationNumber && (
              <div>
                <p className="text-sm text-gray-600">Tax Identification Number</p>
                <p className="font-medium">{vendor.taxIdentificationNumber}</p>
              </div>
            )}
          </div>
          {!vendor.tradeLicenseNumber && !vendor.businessRegistrationNumber && !vendor.taxIdentificationNumber && (
            <p className="text-gray-500 text-center py-4">No trade information available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PerformanceTab({ vendor }: { vendor: VendorProfile }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {vendor.annualTurnover && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Annual Turnover</span>
                <span className="font-semibold">{vendor.annualTurnover}</span>
              </div>
            )}

            {vendor.exportExperience !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Export Experience</span>
                <span className="font-semibold">{vendor.exportExperience ? 'Yes' : 'No'}</span>
              </div>
            )}

            {vendor.paymentTerms && vendor.paymentTerms.length > 0 && (
              <div>
                <span className="text-sm text-gray-600">Payment Terms</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vendor.paymentTerms.map((term, index) => (
                    <Badge key={index} className="bg-gray-100 text-gray-800">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendor.primaryMarkets && vendor.primaryMarkets.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Primary Markets</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vendor.primaryMarkets.map((market, index) => (
                    <Badge key={index} className="bg-blue-100 text-blue-800">
                      {market}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {vendor.exportCountries && vendor.exportCountries.length > 0 && (
              <div>
                <p className="text-sm text-gray-600">Export Countries</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {vendor.exportCountries.map((country, index) => (
                    <Badge key={index} className="bg-green-100 text-green-800">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ReviewItem {
  id: string
  orderId: string
  productName: string
  productSKU: string
  productImage: string
  reviewedDate: string
  status: 'approved' | 'rejected'
  rating: number
  reviewComments: string
  qualityCheckNotes: string
  rejectionReason?: string
  returnToVendor: boolean
  customerName: string
  orderDate: string
  totalAmount: number
  quantity: number
}

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

function ReviewsTab({ vendor }: { vendor: VendorProfile }) {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0 })
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({})
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null)

  const fetchReviews = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true)

      const response = await adminReviewService.getAllAdminReviews({
        vendorId: vendor.id,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        limit: 10,
      })

      if (response.success) {
        const transformed: ReviewItem[] = []
        response.data.forEach((adminReview: AdminOrderReview) => {
          const order = adminReview.order
          if (!order) return
          order.items.forEach((item) => {
            transformed.push({
              id: `${adminReview.id}_${item.id}`,
              orderId: order.orderId,
              productName: item.productName,
              productSKU: item.sku,
              productImage: item.productImage || '',
              reviewedDate: adminReview.reviewedAt || adminReview.createdAt,
              status: adminReview.approved ? 'approved' : 'rejected',
              rating: adminReview.rating || 0,
              reviewComments: adminReview.reviewComments || '',
              qualityCheckNotes: adminReview.qualityCheckNotes || '',
              rejectionReason: adminReview.rejectionReason || undefined,
              returnToVendor: adminReview.returnToVendor,
              customerName: order.customerName,
              orderDate: order.orderDate,
              totalAmount: item.totalPrice,
              quantity: item.quantity,
            })
          })
        })
        setReviews(transformed)
        setStats(response.stats)
        setPagination(response.pagination)
        if (response.ratingDistribution) {
          setRatingDistribution(response.ratingDistribution)
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' })
    } finally {
      setInitialLoading(false)
    }
  }, [vendor.id, searchTerm, statusFilter, currentPage])

  const isFirstLoad = useRef(true)

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      fetchReviews(true)
    } else {
      fetchReviews(false)
    }
  }, [fetchReviews])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )

  const maxDistCount = Math.max(...Object.values(ratingDistribution), 1)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vendor.rating != null ? vendor.rating.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  Based on {vendor.ratingCount ?? 0} review{(vendor.ratingCount ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      {vendor.ratingCount != null && vendor.ratingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] || 0
                const pct = maxDistCount > 0 ? (count / maxDistCount) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-12">{star} star</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by order ID, product name, or comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 bg-white transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="w-full md:w-48">
          <Dropdown
            value={statusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
            onChange={(val) => setStatusFilter(val as string)}
            placeholder="Filter by status"
          />
        </div>
      </div>

      {/* Showing */}
      {!initialLoading && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
        </div>
      )}

      {/* Reviews Table */}
      <Card>
        {initialLoading ? (
          <div className="p-4 space-y-4">
            {/* Skeleton table header */}
            <div className="grid grid-cols-7 gap-4 pb-3 border-b border-gray-200">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            {/* Skeleton table rows */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 items-center py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                <div className="h-5 bg-gray-200 rounded-full animate-pulse w-16" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {review.productImage ? (
                          <img
                            src={review.productImage}
                            alt={review.productName}
                            className="w-10 h-10 object-cover rounded border border-gray-200"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{review.productName}</div>
                          <div className="text-xs text-gray-500">SKU: {review.productSKU}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono text-gray-900">{review.orderId}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-600">({review.rating})</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${review.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {review.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{new Date(review.reviewedDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(review.reviewedDate).toLocaleTimeString()}</div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700 max-w-[180px] truncate">
                        {review.reviewComments || 'No comments'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="p-12 text-center">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium mb-2">No reviews found</p>
                      <p className="text-gray-400 text-sm">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : 'Admin reviews will appear here after quality checks are completed.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!initialLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            {getPageRange(pagination.page, pagination.totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === pagination.page ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.page ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
            <button onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={currentPage === pagination.totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {selectedReview.productImage ? (
                    <img
                      src={selectedReview.productImage}
                      alt={selectedReview.productName}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedReview.productName}</h2>
                    <p className="text-sm text-gray-500 mt-1">SKU: {selectedReview.productSKU}</p>
                    <p className="text-sm text-gray-500">Order ID: {selectedReview.orderId}</p>
                    <div className="mt-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedReview.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedReview.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-sm font-semibold text-gray-700 block mb-2">Quality Rating</label>
                <div className="flex items-center gap-3">
                  {renderStars(selectedReview.rating)}
                  <span className="text-lg font-bold text-gray-900">{selectedReview.rating}/5</span>
                </div>
              </div>

              {/* Review Comments */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Review Comments</label>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-gray-900">{selectedReview.reviewComments || 'No comments provided'}</p>
                </div>
              </div>

              {/* Quality Check Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Quality Check Notes</label>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-gray-900">{selectedReview.qualityCheckNotes || 'No notes provided'}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {selectedReview.rejectionReason && (
                <div>
                  <label className="text-sm font-semibold text-red-700 block mb-2">Rejection Reason</label>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-300">
                    <p className="text-red-900 font-medium">{selectedReview.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Return to Vendor */}
              {selectedReview.returnToVendor && (
                <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Marked for return to vendor</span>
                </div>
              )}

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="text-gray-900 font-medium">{selectedReview.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Quantity</label>
                  <p className="text-gray-900">{selectedReview.quantity} units</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-gray-900 font-medium">&#8377;{selectedReview.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Order Date</label>
                  <p className="text-gray-900">{new Date(selectedReview.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reviewed Date</label>
                  <p className="text-gray-900">{new Date(selectedReview.reviewedDate).toLocaleString()}</p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}