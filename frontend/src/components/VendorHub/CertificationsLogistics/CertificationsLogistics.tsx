'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/UI/Button';
import { Shield, Upload, Package, Award, CheckCircle, X, FileText, Download, Calendar } from 'lucide-react';

interface CertificationsLogisticsProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const certifications = [
  {
    id: 'oeko-tex',
    name: 'OEKO-TEX',
    description: 'Textile safety and environmental standards',
    icon: Shield
  },
  {
    id: 'gots',
    name: 'GOTS',
    description: 'Global Organic Textile Standard',
    icon: Award
  },
  {
    id: 'grs',
    name: 'GRS',
    description: 'Global Recycled Standard',
    icon: CheckCircle
  },
  {
    id: 'smeta',
    name: 'SMETA',
    description: 'Sedex Members Ethical Trade Audit',
    icon: Shield
  }
];

export default function CertificationsLogistics({ onNext, onPrev, onUpdateData, data }: CertificationsLogisticsProps) {
  const [formData, setFormData] = useState({
    selectedCertifications: data.selectedCertifications || [],
    certificationFiles: data.certificationFiles || {},
    certificationExpiryDates: data.certificationExpiryDates || {},
    packagingCapabilities: data.packagingCapabilities || '',
    warehousingCapacity: data.warehousingCapacity || '',
    logisticsPartners: data.logisticsPartners || '',
    shippingMethods: data.shippingMethods || [],
    qualityControlProcess: data.qualityControlProcess || '',
    complianceStandards: data.complianceStandards || ''
  });

  const [uploadErrors, setUploadErrors] = useState<{[key: string]: string}>({});

  // Sync formData with data prop when it changes (for edit mode)
  useEffect(() => {
    console.log('CertificationsLogistics: data prop changed', data)
    setFormData({
      selectedCertifications: data.selectedCertifications || [],
      certificationFiles: data.certificationFiles || {},
      certificationExpiryDates: data.certificationExpiryDates || {},
      packagingCapabilities: data.packagingCapabilities || '',
      warehousingCapacity: data.warehousingCapacity || '',
      logisticsPartners: data.logisticsPartners || '',
      shippingMethods: data.shippingMethods || [],
      qualityControlProcess: data.qualityControlProcess || '',
      complianceStandards: data.complianceStandards || ''
    })
  }, [data])

  const handleCertificationToggle = (certId: string) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.selectedCertifications.includes(certId);
      
      if (isCurrentlySelected) {
        // Remove certification and clean up associated data
        const newFiles = { ...prev.certificationFiles };
        const newExpiryDates = { ...prev.certificationExpiryDates };
        
        // Clean up file URL if it exists
        if (newFiles[certId] && newFiles[certId].url) {
          URL.revokeObjectURL(newFiles[certId].url);
        }
        
        delete newFiles[certId];
        delete newExpiryDates[certId];
        
        return {
          ...prev,
          selectedCertifications: prev.selectedCertifications.filter((id: string) => id !== certId),
          certificationFiles: newFiles,
          certificationExpiryDates: newExpiryDates
        };
      } else {
        // Add certification
        return {
          ...prev,
          selectedCertifications: [...prev.selectedCertifications, certId]
        };
      }
    });
    
    // Clear any errors for this certification
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[certId];
      return newErrors;
    });
  };

  const handleShippingMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      shippingMethods: prev.shippingMethods.includes(method)
        ? prev.shippingMethods.filter((m: string) => m !== method)
        : [...prev.shippingMethods, method]
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExpiryDateChange = (certId: string, date: string) => {
    setFormData(prev => ({
      ...prev,
      certificationExpiryDates: {
        ...prev.certificationExpiryDates,
        [certId]: date
      }
    }));
  };

  // Check if certificate is expired or expiring soon
  const getCertificateStatus = (expiryDate: string) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    } else {
      return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString()}`, color: 'text-green-600 bg-green-50 border-green-200' };
    }
  };

  // File upload handling
  const handleFileUpload = (certId: string, file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setUploadErrors(prev => ({
        ...prev,
        [certId]: 'Invalid file type. Please upload PDF, JPG, or PNG files only.'
      }));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setUploadErrors(prev => ({
        ...prev,
        [certId]: 'File size too large. Maximum size is 10MB.'
      }));
      return;
    }

    // Clear any previous errors
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[certId];
      return newErrors;
    });

    // Create file object with preview URL
    const fileData = {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString()
    };

    // Update form data
    setFormData(prev => ({
      ...prev,
      certificationFiles: {
        ...prev.certificationFiles,
        [certId]: fileData
      }
    }));
  };

  const handleFileChange = (certId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(certId, file);
    }
  };

  const handleFileDrop = (certId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(certId, file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (certId: string) => {
    // Clean up blob URLs to prevent memory leaks (skip for existing Cloudinary URLs)
    const fileData = formData.certificationFiles[certId];
    if (fileData && fileData.url && !fileData.isExisting) {
      URL.revokeObjectURL(fileData.url);
    }

    setFormData(prev => {
      const newFiles = { ...prev.certificationFiles };
      delete newFiles[certId];
      return {
        ...prev,
        certificationFiles: newFiles
      };
    });

    // Clear any errors for this certification
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[certId];
      return newErrors;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleNext = () => {
    onUpdateData(formData);
    onNext();
  };

  return (
    <div className="space-y-4 p-4 max-w-420 font-sans">
      {/* Header */}
          <div className="flex p-2 items-center gap-4 mb-4">
            <Shield className="w-12 h-12 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quality, Certifications & Logistics</h1>
              <p className="text-gray-600 mt-1">Showcase your quality standards and logistics capabilities</p>
            </div>
          </div>

      {/* Certifications */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Certifications
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certifications.map((cert) => {
              const Icon = cert.icon;
              const isSelected = formData.selectedCertifications.includes(cert.id);
              
              return (
                <div key={cert.id} className="space-y-3">
                  <div
                    onClick={() => handleCertificationToggle(cert.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`w-6 h-6 mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <h3 className="font-medium text-gray-900">{cert.name}</h3>
                        <p className="text-sm text-gray-600">{cert.description}</p>
                      </div>
                      <div className="ml-auto">
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Upload field and expiry date for selected certifications */}
                  {isSelected && (
                    <div className="ml-9 space-y-4">
                      {/* Expiry Date Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Certificate Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.certificationExpiryDates[cert.id] || ''}
                          onChange={(e) => handleExpiryDateChange(cert.id, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={new Date().toISOString().split('T')[0]} // Prevent past dates
                        />
                        
                        {/* Certificate Status */}
                        {formData.certificationExpiryDates[cert.id] && (
                          <div className="mt-2">
                            {(() => {
                              const status = getCertificateStatus(formData.certificationExpiryDates[cert.id]);
                              return status ? (
                                <div className={`text-sm px-3 py-1 rounded border ${status.color} inline-block`}>
                                  {status.message}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>

                      {/* File Upload Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload {cert.name} Certificate
                        </label>
                        
                        {/* Check if file is already uploaded */}
                        {formData.certificationFiles[cert.id] ? (
                          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="shrink-0">
                                  {formData.certificationFiles[cert.id].type === 'application/pdf' ? (
                                    <FileText className="w-12 h-12 text-red-500" />
                                  ) : (
                                    <img
                                      src={formData.certificationFiles[cert.id].url}
                                      alt="Certificate preview"
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {formData.certificationFiles[cert.id].name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formData.certificationFiles[cert.id].isExisting
                                      ? 'Uploaded'
                                      : formatFileSize(formData.certificationFiles[cert.id].size)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {(formData.certificationFiles[cert.id].isExisting || formData.certificationFiles[cert.id].type !== 'application/pdf') && (
                                  <button
                                    type="button"
                                    onClick={() => window.open(formData.certificationFiles[cert.id].url, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="View"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeFile(cert.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Remove file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer"
                            onDrop={(e) => handleFileDrop(cert.id, e)}
                            onDragOver={handleDragOver}
                            onClick={() => document.getElementById(`file-${cert.id}`)?.click()}
                          >
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
                            
                            <input
                              id={`file-${cert.id}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(cert.id, e)}
                              className="hidden"
                            />
                          </div>
                        )}
                        
                        {/* Display upload errors */}
                        {uploadErrors[cert.id] && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                            {uploadErrors[cert.id]}
                          </div>
                        )}
                        
                        {/* Upload success message - only show for newly uploaded files */}
                        {formData.certificationFiles[cert.id] && !uploadErrors[cert.id] && !formData.certificationFiles[cert.id].isExisting && (
                          <div className="mt-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
                            ✓ Certificate uploaded successfully
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Uploaded Files Summary */}
      {Object.keys(formData.certificationFiles).length > 0 && (
        <section className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Uploaded Certificates ({Object.keys(formData.certificationFiles).length})
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.certificationFiles).map(([certId, fileData]: [string, any]) => {
                const cert = certifications.find(c => c.id === certId);
                const expiryDate = formData.certificationExpiryDates[certId];
                const status = expiryDate ? getCertificateStatus(expiryDate) : null;
                
                return (
                  <div key={certId} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="shrink-0">
                          {fileData.type === 'application/pdf' ? (
                            <FileText className="w-6 h-6 text-red-500" />
                          ) : (
                            <img
                              src={fileData.url}
                              alt="Certificate preview"
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {cert?.name || certId}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {fileData.name} • {formatFileSize(fileData.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(certId)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Expiry Status */}
                    {status && (
                      <div className={`text-xs px-2 py-1 rounded border ${status.color} inline-block`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {status.message}
                      </div>
                    )}
                    
                    {expiryDate && !status && (
                      <div className="text-xs text-gray-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Expires: {new Date(expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Quality Control */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Quality Control Process
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Control Process Description
            </label>
            <textarea
              value={formData.qualityControlProcess}
              onChange={(e) => handleInputChange('qualityControlProcess', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe your quality control processes, testing procedures, and standards..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Standards
            </label>
            <input
              type="text"
              value={formData.complianceStandards}
              onChange={(e) => handleInputChange('complianceStandards', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ISO 9001, ISO 14001, etc."
            />
          </div>
        </div>
      </section>

      {/* Packaging & Logistics */}
      <section className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Packaging & Logistics
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Packaging Capabilities
              </label>
              <textarea
                value={formData.packagingCapabilities}
                onChange={(e) => handleInputChange('packagingCapabilities', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Custom packaging, eco-friendly options, bulk packaging..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehousing Capacity (sq ft)
              </label>
              <input
                type="number"
                value={formData.warehousingCapacity}
                onChange={(e) => handleInputChange('warehousingCapacity', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logistics Partners
            </label>
            <input
              type="text"
              value={formData.logisticsPartners}
              onChange={(e) => handleInputChange('logisticsPartners', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="DHL, FedEx, UPS, Local carriers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Shipping Methods
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Air Freight', 'Sea Freight', 'Road Transport', 'Express Delivery'].map((method) => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.shippingMethods.includes(method)}
                    onChange={() => handleShippingMethodToggle(method)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between text-white ">
        <Button
          onClick={onPrev}
          className="px-8 font-bold bg-green-400 hover:bg-gray-300"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 px-8 font-bold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}