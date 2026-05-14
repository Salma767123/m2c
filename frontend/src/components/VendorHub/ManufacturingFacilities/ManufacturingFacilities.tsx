'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Factory, Settings, Palette, Printer, Scissors, Shirt } from 'lucide-react';

interface ManufacturingFacilitiesProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const facilityTypes = [
  {
    id: 'spinning',
    label: 'Spinning',
    icon: Settings,
    description: 'Yarn and thread production',
    fields: [
      { id: 'spinningCapacity', label: 'Daily Capacity (kg)', type: 'number' },
      { id: 'spinningMachines', label: 'Number of Machines', type: 'number' },
      { id: 'yarnTypes', label: 'Yarn Types', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' } // added
    ]
  },
  {
    id: 'weaving',
    label: 'Weaving',
    icon: Scissors,
    description: 'Fabric production',
    fields: [
      { id: 'weavingCapacity', label: 'Daily Capacity (meters)', type: 'number' },
      { id: 'loomCount', label: 'Number of Looms', type: 'number' },
      { id: 'fabricTypes', label: 'Fabric Types', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' } // added
    ]
  },
  {
    id: 'dyeing',
    label: 'Dyeing',
    icon: Palette,
    description: 'Fabric coloring and treatment',
    fields: [
      { id: 'dyeingCapacity', label: 'Daily Capacity (kg)', type: 'number' },
      { id: 'dyeingMachines', label: 'Number of Machines', type: 'number' },
      { id: 'colorRange', label: 'Color Range', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' } // added
    ]
  },
  {
    id: 'printing',
    label: 'Printing',
    icon: Printer,
    description: 'Pattern and design printing',
    fields: [
      { id: 'printingCapacity', label: 'Daily Capacity (meters)', type: 'number' },
      { id: 'printingMachines', label: 'Number of Machines', type: 'number' },
      { id: 'printingTypes', label: 'Printing Methods', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' } // added
    ]
  },
  {
    id: 'stitching',
    label: 'Stitching',
    icon: Shirt,
    description: 'Cutting and stitching of garments',
    fields: [
      { id: 'stitchingCapacity', label: 'Daily Capacity (pieces)', type: 'number' },
      { id: 'stitchingMachines', label: 'Number of Machines', type: 'number' },
      { id: 'stitchingTypes', label: 'Stitching Types', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  {
    id: 'finishing',
    label: 'Finishing',
    icon: Factory,
    description: 'Final processing and quality control',
    fields: [
      { id: 'finishingCapacity', label: 'Daily Capacity (pieces)', type: 'number' },
      { id: 'finishingStations', label: 'Number of Stations', type: 'number' },
      { id: 'finishingTypes', label: 'Finishing Processes', type: 'text' },
      { id: 'description', label: 'Description', type: 'textarea' } // added
    ]
  }
];

export default function ManufacturingFacilities({ onNext, onPrev, onUpdateData, data }: ManufacturingFacilitiesProps) {
  const [formData, setFormData] = useState({
    enabledFacilities: data.enabledFacilities || {},
    facilityDetails: data.facilityDetails || {}
  });

  // Sync formData with data prop when it changes (for edit mode)
  useEffect(() => {
    console.log('ManufacturingFacilities: data prop changed', data)
    setFormData({
      enabledFacilities: data.enabledFacilities || {},
      facilityDetails: data.facilityDetails || {}
    })
  }, [data])

  const handleToggleFacility = (facilityId: string) => {
    setFormData(prev => ({
      ...prev,
      enabledFacilities: {
        ...prev.enabledFacilities,
        [facilityId]: !prev.enabledFacilities[facilityId]
      }
    }));
  };

  const handleFieldChange = (facilityId: string, fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      facilityDetails: {
        ...prev.facilityDetails,
        [facilityId]: {
          ...prev.facilityDetails[facilityId],
          [fieldId]: value
        }
      }
    }));
  };

  // Helper function to get field value with guaranteed string (never undefined or null)
  const getFieldValue = (facilityId: string, fieldId: string): string => {
    const value = formData.facilityDetails[facilityId]?.[fieldId];
    // Ensure we always return a string - handles undefined, null, and any other falsy values
    return typeof value === 'string' ? value : '';
  };

  const handleNext = () => {
    onUpdateData(formData);
    onNext();
  };

  return (
    <div className="max-w-420 p-4 space-y-4 font-sans">
      
      {/* Header */}
          <div className="flex p-2 items-center gap-4 mb-4">
            <Factory className="w-12 h-12 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manufacturing Facilities</h1>
              <p className="text-gray-600 mt-2">Select your manufacturing capabilities and provide details</p>
            </div>
          </div>

      {/* Facilities */}
      <div className="space-y-6">
        {facilityTypes.map((facility) => {
          const Icon = facility.icon;
          const isEnabled = Boolean(formData.enabledFacilities[facility.id]);

          return (
            <Card key={facility.id} className={isEnabled ? 'border-blue-200 bg-blue-50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <CardTitle className="text-lg">{facility.label}</CardTitle>
                      <p className="text-sm text-gray-600">{facility.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleFacility(facility.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardHeader>

              {isEnabled && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {facility.fields.map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            value={getFieldValue(facility.id, field.id)}
                            onChange={(e) => handleFieldChange(facility.id, field.id, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            rows={3}
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={getFieldValue(facility.id, field.id)}
                            onChange={(e) => handleFieldChange(facility.id, field.id, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {Object.values(formData.enabledFacilities).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle>Manufacturing Capabilities Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {facilityTypes.map((facility) => {
                const isEnabled = formData.enabledFacilities[facility.id];
                const Icon = facility.icon;
                
                return (
                  <div
                    key={facility.id}
                    className={`p-3 rounded-lg text-center ${
                      isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{facility.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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