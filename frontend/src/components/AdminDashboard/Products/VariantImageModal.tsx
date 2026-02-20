'use client';

import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { useState } from 'react';
import { showWarningToast, showErrorToast } from '@/lib/toast-utils';

interface VariantImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    variantData: {
        id: string;
        size: string;
        color: string;
        images: string[];
    };
    onUpdateImages: (variantId: string, newImages: string[]) => void;
}

export default function VariantImageModal({
    isOpen,
    onClose,
    variantData,
    onUpdateImages
}: VariantImageModalProps) {
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Only take the first file since we restrict to 1 image
        const file = files[0];

        // Validation (Size) - 5MB limit
        if (file.size > 5 * 1024 * 1024) {
            showWarningToast('File Too Large', `${file.name} exceeds 5MB limit.`);
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                // Replace existing images with the new one (enforce 1 image limit)
                onUpdateImages(variantData.id, [event.target.result as string]);
            }
            setIsUploading(false);
            // Clear input
            e.target.value = '';
        };
        reader.onerror = () => {
            showErrorToast('Upload Failed', `Failed to read ${file.name}`);
            setIsUploading(false);
            e.target.value = '';
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        onUpdateImages(variantData.id, []);
    };

    const existingImage = variantData.images.length > 0 ? variantData.images[0] : null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            Variant Image
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {variantData.size} / {variantData.color}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {existingImage ? (
                        <div className="space-y-4">
                            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={existingImage}
                                    alt={`${variantData.size} ${variantData.color}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={removeImage}
                                        className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove
                                    </button>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">Want to change this image?</p>
                                <div className="relative inline-block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <Button variant="outline" disabled={isUploading}>
                                        {isUploading ? 'Uploading...' : 'Upload New Image'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex flex-col items-center justify-center pointer-events-none">
                                <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <p className="font-semibold text-gray-900 mb-1">
                                    {isUploading ? 'Uploading...' : 'Click to upload image'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    PNG, JPG, WEBP up to 5MB
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <Button onClick={onClose}>
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}
