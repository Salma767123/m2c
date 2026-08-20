"use client"

import React, { useState, useEffect } from 'react';
import { X, Package, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { FacePicker, type FaceValue } from '@/components/WebSite/Shared/FaceRating';
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

export default function ReviewModal({ isOpen, onClose, orderId, items }: ReviewModalProps) {
    const [selectedProduct, setSelectedProduct] = useState<string | null>(
        items.length === 1 ? items[0].productId : null
    );
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedProduct(items.length === 1 ? items[0].productId : null);
            setRating(0);
            setComment('');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) {
            setError('Please select a product to review');
            return;
        }
        if (rating === 0) {
            setError('Please tell us how it was');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-playfair text-base sm:text-lg font-semibold text-[#1a1a1a]">Write a Review</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Share your experience</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">
                    {success ? (
                        /* Success State */
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-1">Thank You!</h3>
                            <p className="text-sm text-gray-500 mb-4">Your review has been submitted and is pending approval.</p>
                            <button
                                onClick={onClose}
                                className="btn-shine px-6 py-2.5 bg-[#e01a1b] text-white text-sm font-semibold rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300"
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
                                                        ? 'border-[#e01a1b] bg-[#e01a1b]/5'
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
                                                <p className="flex-1 text-sm font-semibold text-gray-900 break-words">
                                                    {item.name || item.productName}
                                                </p>
                                                {selected && items.length > 1 && (
                                                    <div className="w-2.5 h-2.5 bg-[#e01a1b] rounded-full shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* How was it? One tap.
                                It was five stars, which asks the customer to score
                                a product out of five before they can say anything
                                at all -- a judgement most people skip. A face is
                                one decision, and it stores exactly the same 1-5
                                value underneath, so averages, filters, sorting and
                                the admin reports are all unaffected. */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    How was it?
                                </label>
                                <div className="py-2">
                                    <FacePicker value={rating} onChange={(v: FaceValue) => setRating(v)} />
                                </div>
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
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] resize-none text-sm bg-gray-50 placeholder:text-gray-400"
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
                                className="btn-shine w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#e01a1b] text-white rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[0_6px_20px_rgba(224,26,27,0.3)] text-sm"
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
