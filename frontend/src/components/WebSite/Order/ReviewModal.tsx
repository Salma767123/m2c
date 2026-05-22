"use client"

import React, { useState, useEffect } from 'react';
import { X, Star, Package, Send, CheckCircle, AlertCircle } from 'lucide-react';
import reviewService from '@/services/reviewService';
import Image from 'next/image';

interface ReviewItem {
    id?: string;
    productId: string;
    productName?: string;
    name?: string;
    productImage?: string;
    image?: string;
}

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    items: ReviewItem[];
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewModal({ isOpen, onClose, orderId, items }: ReviewModalProps) {
    const [selectedProduct, setSelectedProduct] = useState<string | null>(
        items.length === 1 ? items[0].productId : null
    );
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedProduct(items.length === 1 ? items[0].productId : null);
            setRating(0);
            setHoveredRating(0);
            setComment('');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;

    const activeRating = hoveredRating || rating;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) {
            setError('Please select a product to review');
            return;
        }
        if (rating === 0) {
            setError('Please select a star rating');
            return;
        }
        setError(null);
        setLoading(true);

        try {
            await reviewService.submitReview({
                productId: selectedProduct,
                orderId,
                rating,
                comment: comment.trim(),
                images: []
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || 'Failed to submit review. You may have already reviewed this product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Write a Review</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Share your experience</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 py-5">
                    {success ? (
                        /* Success State */
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Thank You!</h3>
                            <p className="text-sm text-gray-500 mb-4">Your review has been submitted and is pending approval.</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Product Selection */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    {items.length > 1 ? 'Select Product' : 'Product'}
                                </label>
                                <div className="space-y-2">
                                    {items.map((item) => {
                                        const id = item.productId;
                                        const selected = selectedProduct === id;
                                        return (
                                            <div
                                                key={item.id || id}
                                                onClick={() => items.length > 1 && setSelectedProduct(id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                                    items.length > 1 ? 'cursor-pointer' : ''
                                                } ${
                                                    selected
                                                        ? 'border-gray-900 bg-gray-50'
                                                        : 'border-gray-100 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="relative w-11 h-11 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                                                    {(item.image || item.productImage) ? (
                                                        <Image
                                                            src={(item.image || item.productImage)!}
                                                            alt={item.name || item.productName || 'Product'}
                                                            fill
                                                            sizes="44px"
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-5 h-5 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="flex-1 text-sm font-semibold text-gray-900 line-clamp-1">
                                                    {item.name || item.productName}
                                                </p>
                                                {selected && items.length > 1 && (
                                                    <div className="w-2.5 h-2.5 bg-gray-900 rounded-full shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Star Rating */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Your Rating
                                </label>
                                <div className="flex items-center gap-1 justify-center py-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                        >
                                            <Star
                                                className={`w-9 h-9 transition-colors ${
                                                    star <= activeRating
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-gray-200'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                {activeRating > 0 && (
                                    <p className="text-center text-sm font-semibold text-amber-500 mt-1">
                                        {RATING_LABELS[activeRating]}
                                    </p>
                                )}
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Your Review <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value.slice(0, 500))}
                                    rows={3}
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none resize-none text-sm bg-gray-50 placeholder:text-gray-400"
                                    placeholder="What did you like or dislike about this product?"
                                />
                                <p className="text-right text-[11px] text-gray-400 mt-1">{comment.length}/500</p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !selectedProduct || rating === 0}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {loading ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
