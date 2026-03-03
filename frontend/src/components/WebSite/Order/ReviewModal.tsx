"use client"

import React, { useState } from 'react';
import { X, Star, Upload, Package } from 'lucide-react';
import reviewService from '@/services/reviewService';
import Image from 'next/image';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    items: any[];
}

export default function ReviewModal({ isOpen, onClose, orderId, items }: ReviewModalProps) {
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [rating, setRating] = useState(5);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) {
            setError('Please select a product to review');
            return;
        }
        setError(null);
        setLoading(true);

        try {
            await reviewService.submitReview({
                productId: selectedProduct,
                orderId,
                rating,
                comment,
                images: []
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setRating(5);
                setComment('');
                setSelectedProduct(null);
            }, 2000);
        } catch (err: any) {
            setError(err?.message || 'Failed to submit review. You may have already reviewed this product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-semibold">Write a Review</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star className="w-8 h-8 fill-current" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Review Submitted!</h3>
                            <p className="text-slate-600">Thank you for your feedback.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Product Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Select Product to Review
                                </label>
                                <div className="grid gap-3">
                                    {items.map((item) => (
                                        <label
                                            key={item.id}
                                            className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedProduct === item.productId
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-slate-200 hover:border-blue-200'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="product"
                                                value={item.productId}
                                                checked={selectedProduct === item.productId}
                                                onChange={(e) => setSelectedProduct(e.target.value)}
                                                className="hidden"
                                            />
                                            <div className="relative w-12 h-12 bg-white rounded-lg overflow-hidden border">
                                                {(item.image || item.productImage) ? (
                                                    <Image src={item.image || item.productImage} alt={item.name || item.productName || 'Product'} fill className="object-cover" />
                                                ) : (
                                                    <Package className="w-6 h-6 m-3 text-slate-400" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900 text-sm line-clamp-1">{item.name || item.productName}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Rating
                                </label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="p-1 focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`w-8 h-8 ${star <= (hoveredRating || rating)
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-slate-200'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Your Review
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    placeholder="What did you like or dislike about this product?"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !selectedProduct}
                                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
