'use client'

import { useState, useEffect } from 'react'
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
  Eye
} from 'lucide-react'
import VendorService, { VendorProfile } from '@/services/vendorService'
import { toast } from '@/hooks/use-toast'
import RejectionModal from './RejectionModal'
import SuspensionModal from './SuspensionModal'

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
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'facilities', label: 'Facilities', icon: Factory },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Star }
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
                <p className="text-gray-600">Vendor ID: {vendor.id}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {getStatusBadge(vendor.status)}
              
              {/* Action Buttons */}
              {vendor.status === 'PENDING' && (
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
              
              {vendor.status === 'APPROVED' && (
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
              
              <Button
                onClick={() => router.push(`/admin/dashboard/vendors/edit/${vendor.id}`)}
                className="bg-[#313131] text-white hover:bg-[#222222]"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Vendor
              </Button>
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
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
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
        {activeTab === 'products' && <ProductsTab vendor={vendor} />}
        {activeTab === 'facilities' && <FacilitiesTab vendor={vendor} />}
        {activeTab === 'documents' && <DocumentsTab vendor={vendor} />}
        {activeTab === 'performance' && <PerformanceTab vendor={vendor} />}
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
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
            <p>{vendor.businessCity}, {vendor.businessState}</p>
            <p>{vendor.businessCountry}</p>
          </div>
        </CardContent>
      </Card>

      {vendor.warehouseAddress && (
        <Card>
          <CardHeader>
            <CardTitle>Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium">{vendor.warehouseAddress}</p>
                <p className="font-medium">{vendor.warehouseCity}, {vendor.warehouseState}</p>
              </div>
              {vendor.warehouseSize && (
                <div>
                  <p className="text-sm text-gray-600">Size</p>
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
              {vendor.productCategories.map((category, index) => (
                <Badge key={index} className="bg-green-100 text-green-800 capitalize">
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
              {vendor.productTypes.map((type, index) => (
                <Badge key={index} className="bg-indigo-100 text-indigo-800">
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
          <div className="text-center py-8 text-gray-500">
            No documents uploaded yet.
          </div>
        )}
      </CardContent>
    </Card>
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