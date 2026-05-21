"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/UI/Button";
import LocationPicker from "@/components/UI/LocationPicker";
import {
  Warehouse,
  Upload,
  MapPin,
  Camera,
  Map,
  X,
  ShieldUser,
} from "lucide-react";
import Select from "react-select";
import countryList from "react-select-country-list";

const options = countryList().getData();

interface WarehouseDetailsProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const ownershipTypes = [
  { id: "owned", label: "Owned", description: "You own the facility" },
  { id: "rented", label: "Rented", description: "Monthly rental agreement" },
  { id: "lease", label: "Lease", description: "Long-term lease agreement" },
];

export default function WarehouseDetails({
  onNext,
  onPrev,
  onUpdateData,
  data,
}: WarehouseDetailsProps) {
  const [formData, setFormData] = useState({
    ownershipType: data.ownershipType || "",
    warehouseAddress: data.warehouseAddress || "",
    warehouseCity: data.warehouseCity || "",
    warehouseState: data.warehouseState || "",
    warehouseZip: data.warehouseZip || "",
    warehouseCountry: data.warehouseCountry || "United States",
    factoryImages: data.factoryImages || [],
    routeMap: data.routeMap || null,
    mapLink: data.mapLink || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync formData with data prop when it changes (for edit mode)
  useEffect(() => {
    console.log('WarehouseDetails: data prop changed', data)
    setFormData({
      ownershipType: data.ownershipType || "",
      warehouseAddress: data.warehouseAddress || "",
      warehouseCity: data.warehouseCity || "",
      warehouseState: data.warehouseState || "",
      warehouseZip: data.warehouseZip || "",
      warehouseCountry: data.warehouseCountry || "United States",
      factoryImages: data.factoryImages || [],
      routeMap: data.routeMap || null,
      mapLink: data.mapLink || "",
    })
  }, [data]);

  // Check if address was copied from company details
  const isAddressCopied = data.sameAsWarehouse &&
    data.warehouseAddress === data.address &&
    data.warehouseCity === data.city &&
    data.warehouseState === data.state &&
    data.warehouseZip === data.zipCode &&
    data.warehouseCountry === data.country;

  const clearCopiedAddress = () => {
    setFormData(prev => ({
      ...prev,
      warehouseAddress: "",
      warehouseCity: "",
      warehouseState: "",
      warehouseZip: "",
      warehouseCountry: "United States"
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleNext = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};

    if (!formData.ownershipType) newErrors.ownershipType = 'Ownership Type is required';
    if (!formData.warehouseAddress) newErrors.warehouseAddress = 'Warehouse Address is required';
    if (!formData.warehouseCity) newErrors.warehouseCity = 'City is required';
    if (!formData.warehouseState) newErrors.warehouseState = 'State is required';
    if (!formData.warehouseZip) newErrors.warehouseZip = 'ZIP Code is required';
    if (!formData.warehouseCountry) newErrors.warehouseCountry = 'Country is required';
    if (!formData.mapLink) {
      newErrors.mapLink = 'Please paste your Google Maps embed link';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.querySelector(
        `[name="${firstErrorField}"], [data-field-name="${firstErrorField}"]`,
      );
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    onUpdateData(formData);
    onNext();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Create preview URLs for the new files
    const newImages = files.map((file) => ({
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      id: Date.now() + Math.random(), // Simple unique ID
    }));

    handleInputChange("factoryImages", [
      ...formData.factoryImages,
      ...newImages,
    ]);
  };

  const removeImage = (imageId: string | number) => {
    const updatedImages = formData.factoryImages.filter(
      (img: any) => img.id !== imageId
    );
    // Clean up blob URLs to prevent memory leaks (only for newly uploaded images)
    const imageToRemove = formData.factoryImages.find(
      (img: any) => img.id === imageId
    );
    if (imageToRemove && imageToRemove.url && !imageToRemove.isExisting) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    handleInputChange("factoryImages", updatedImages);
  };

  return (
    <div className="max-w-420 p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="flex p-2 items-center gap-4 pb-4 mb-4">
        <Warehouse className="w-12 h-12 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Details</h1>
          <p className="text-gray-600 mt-1">Please provide the details of your warehouse facility</p>
        </div>
      </div>

      {/* Ownership Type */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm ">
        <div className="px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <ShieldUser className="w-6 h-6 mr-2" />
            Facility Ownership <span className="text-red-500 text-lg ml-1">*</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            Select the type of ownership for your warehouse facility
          </p>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {ownershipTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => handleInputChange("ownershipType", type.id)}
                className={`p-4 rounded-4xl cursor-pointer transition-colors ${formData.ownershipType === type.id
                    ? "border-2 border-blue-600 bg-blue-50 text-blue-700 "
                    : errors.ownershipType && touched.ownershipType
                      ? "border-2 border-red-500 bg-red-50"
                      : "bg-gray-100 text-gray-500"
                  }`}
              >
                <div className="font-semibold text-base">{type.label}</div>
              </div>
            ))}
          </div>
          {errors.ownershipType && touched.ownershipType && (
            <p className="text-red-500 text-sm mt-2">{errors.ownershipType}</p>
          )}
        </div>
      </section>

      {/* Warehouse Address */}
      <section className="bg-white rounded-lg max-w-2xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 ">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Warehouse Address
          </h2>
          {isAddressCopied && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Address copied from company details.</strong> You can modify these fields if your warehouse address is different.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearCopiedAddress}
                  className="ml-4 px-3 py-1 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                >
                  Clear & Enter New
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-4 space-y-6">
          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Street Address <span className="text-red-500 text-lg">*</span>
            </label>
            <input
              type="text"
              name="warehouseAddress"
              value={formData.warehouseAddress}
              onChange={(e) =>
                handleInputChange("warehouseAddress", e.target.value)
              }
              onBlur={() => handleBlur("warehouseAddress")}
              className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.warehouseAddress && touched.warehouseAddress
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
                }`}
              placeholder="Enter Street Address"
            />
            {errors.warehouseAddress && touched.warehouseAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.warehouseAddress}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                City <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="warehouseCity"
                value={formData.warehouseCity}
                onChange={(e) =>
                  handleInputChange("warehouseCity", e.target.value)
                }
                onBlur={() => handleBlur("warehouseCity")}
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.warehouseCity && touched.warehouseCity
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                  }`}
                placeholder="City"
              />
              {errors.warehouseCity && touched.warehouseCity && (
                <p className="text-red-500 text-sm mt-1">{errors.warehouseCity}</p>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                State/Province <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="warehouseState"
                value={formData.warehouseState}
                onChange={(e) => handleInputChange("warehouseState", e.target.value)}
                onBlur={() => handleBlur("warehouseState")}
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.warehouseState && touched.warehouseState
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                  }`}
                placeholder="State"
              />
              {errors.warehouseState && touched.warehouseState && (
                <p className="text-red-500 text-sm mt-1">{errors.warehouseState}</p>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                ZIP/Postal Code <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="warehouseZip"
                value={formData.warehouseZip}
                onChange={(e) =>
                  handleInputChange("warehouseZip", e.target.value)
                }
                onBlur={() => handleBlur("warehouseZip")}
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.warehouseZip && touched.warehouseZip
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                  }`}
                placeholder="ZIP Code"
              />
              {errors.warehouseZip && touched.warehouseZip && (
                <p className="text-red-500 text-sm mt-1">{errors.warehouseZip}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Country <span className="text-red-500 text-lg">*</span>
            </label>
            <Select
              options={options}
              value={options.find(
                (opt) => opt.label === formData.warehouseCountry
              )}
              onChange={(option: any) => {
                handleInputChange("warehouseCountry", option ? option.label : "");
                handleBlur("warehouseCountry");
              }}
              className="w-full"
              classNamePrefix="react-select"
              instanceId="warehouse-country-select"
              isClearable
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: errors.warehouseCountry && touched.warehouseCountry ? '#ef4444' : base.borderColor,
                  backgroundColor: errors.warehouseCountry && touched.warehouseCountry ? '#fef2f2' : base.backgroundColor,
                })
              }}
            />
            {errors.warehouseCountry && touched.warehouseCountry && (
              <p className="text-red-500 text-sm mt-1">{errors.warehouseCountry}</p>
            )}
          </div>
        </div>
      </section>

      {/* Factory Images */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Factory Images
          </h2>
        </div>
        <div className="px-6 pb-6 space-y-6 max-w-2xl">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="mb-4">
              <label htmlFor="factory-images" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">
                  Click to upload factory images
                </span>
                <span className="text-gray-600"> or drag and drop</span>
              </label>
              <input
                id="factory-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500">
              PNG, JPG, GIF up to 10MB each
            </p>
          </div>

          {formData.factoryImages.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">
                Uploaded Images ({formData.factoryImages.length}):
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formData.factoryImages.map((image: any, index: number) => (
                  <div key={image.id || index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={`Factory image ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Camera className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id || index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Image name */}
                    <div className="mt-2">
                      <p
                        className="text-xs text-gray-600 truncate"
                        title={image.name}
                      >
                        {image.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Route Map */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Map className="w-5 h-5 mr-2" />
            Location Map
          </h2>
        </div>
        <div className="px-6 pb-6">
          <p className="text-gray-600 mb-4">
            Search for your warehouse address or drop a pin on the map — the
            embeddable map link is generated automatically.
          </p>
          <div data-field-name="mapLink">
            <LocationPicker
              label="Warehouse Location"
              required
              value={formData.mapLink}
              onChange={(link) => {
                handleInputChange("mapLink", link);
                // Live-sync mapLink to parent — unlike text inputs (which sync
                // on "Continue" click), mapLink is set programmatically and the
                // user may jump to Review via the sidebar without clicking Continue.
                onUpdateData({ mapLink: link });
              }}
              error={errors.mapLink && touched.mapLink ? errors.mapLink : undefined}
            />
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
