"use client"

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Send, CheckCircle, AlertCircle, Truck } from 'lucide-react';
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
    // Eligibility drives what the modal offers: which products can still be
    // reviewed (never reviewed before, lifetime) and whether purchase-experience
    // feedback has already been given for this order.
    const [loadingEligibility, setLoadingEligibility] = useState(true);
    const [reviewableItems, setReviewableItems] = useState<ReviewItem[]>([]);
    const [showExperience, setShowExperience] = useState(true);

    // Product review section
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // Purchase-experience feedback section
    const [expRating, setExpRating] = useState(0);
    const [expComment, setExpComment] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    // Portal target is only available on the client; guard against SSR.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Reset + load eligibility when the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        setRating(0);
        setComment('');
        setExpRating(0);
        setExpComment('');
        setError(null);
        setSuccess(false);
        setLoadingEligibility(true);
        setReviewableItems([]);
        setSelectedProduct(null);
        setShowExperience(true);

        let cancelled = false;
        (async () => {
            const res = await reviewService.getOrderReviewEligibility(orderId);
            if (cancelled) return;
            const elig = res?.data;
            const reviewedSet = new Set(
                (elig?.products || []).filter((p) => p.reviewed).map((p) => p.productId)
            );
            // De-duplicate items by productId and keep only those not yet reviewed.
            const seen = new Set<string>();
            const canReview = items.filter((it) => {
                if (!it.productId || seen.has(it.productId)) return false;
                seen.add(it.productId);
                return !reviewedSet.has(it.productId);
            });
            setReviewableItems(canReview);
            setSelectedProduct(canReview.length === 1 ? canReview[0].productId : null);
            // If eligibility failed to load, fall back to showing everything.
            setShowExperience(elig ? !elig.experienceReviewed : true);
            setLoadingEligibility(false);
        })();
        return () => { cancelled = true; };
    }, [isOpen, orderId, items]);

    if (!isOpen || !mounted) return null;

    const hasProductSection = reviewableItems.length > 0;
    const nothingToDo = !loadingEligibility && !hasProductSection && !showExperience;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Determine what the customer actually wants to submit.
        const wantsProduct = hasProductSection && (selectedProduct !== null || rating > 0);
        const wantsExperience = showExperience;

        if (!wantsProduct && !wantsExperience) {
            setError('Please share a rating to submit.');
            return;
        }
        if (wantsProduct) {
            if (!selectedProduct) { setError('Please select a product to review.'); return; }
            if (rating === 0) { setError('Please rate the product.'); return; }
        }
        if (wantsExperience && expRating === 0) {
            setError('Please rate your purchase experience.');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            if (wantsProduct && selectedProduct) {
                await reviewService.submitReview({
                    productId: selectedProduct,
                    orderId,
                    rating,
                    comment: comment.trim(),
                    images: []
                });
            }
            if (wantsExperience) {
                await reviewService.submitExperienceReview({
                    orderId,
                    rating: expRating,
                    comment: expComment.trim(),
                    images: []
                });
            }
            setSuccess(true);
        } catch (err: any) {
            setError(err?.message || 'Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = (hasProductSection && rating > 0) || (showExperience && expRating > 0);

    // Render through a portal to document.body so a transformed/filtered ancestor
    // (the profile page's animated Reveal + gradient layers) can't confine the
    // fixed overlay — this keeps the scrim + blur over the WHOLE viewport
    // (sidebar included) and the dialog truly centred.
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="flex w-full max-w-md max-h-[94vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:max-h-[90vh] sm:rounded-2xl sm:zoom-in-95 sm:slide-in-from-bottom-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="min-w-0">
                        <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a]">Write a Review</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Share your experience</p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">
                    {loadingEligibility ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-[#e01a1b]/25 border-t-[#e01a1b] rounded-full animate-spin" />
                            <p className="text-sm text-slate-500">Loading…</p>
                        </div>
                    ) : success ? (
                        /* Success State */
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-1">Thank You!</h3>
                            <p className="text-sm text-slate-500 mb-4">Your feedback has been submitted and is pending approval.</p>
                            <button
                                onClick={onClose}
                                className="btn-shine px-6 py-2.5 bg-[#e01a1b] text-white text-sm font-semibold rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300"
                            >
                                Done
                            </button>
                        </div>
                    ) : nothingToDo ? (
                        <div className="text-center py-10">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-7 h-7 text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">You&apos;re all caught up</p>
                            <p className="text-xs text-slate-500 mt-1">You&apos;ve already reviewed everything for this order.</p>
                            <button
                                onClick={onClose}
                                className="mt-5 px-6 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ===== Product review (only for products not yet reviewed) ===== */}
                            {hasProductSection && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="grid h-6 w-6 place-items-center rounded-full bg-red-50 text-[#e01a1b]"><Package className="w-3.5 h-3.5" /></span>
                                        <h3 className="text-sm font-semibold text-slate-900">Product Review</h3>
                                    </div>

                                    {/* Product Selection */}
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                            {reviewableItems.length > 1 ? 'Select Product' : 'Product'}
                                        </label>
                                        <div className="space-y-2">
                                            {reviewableItems.map((item) => {
                                                const id = item.productId;
                                                const selected = selectedProduct === id;
                                                return (
                                                    <div
                                                        key={item.id || id}
                                                        onClick={() => reviewableItems.length > 1 && setSelectedProduct(id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                            reviewableItems.length > 1 ? 'cursor-pointer' : ''
                                                        } ${
                                                            selected
                                                                ? 'border-[#e01a1b] bg-red-50/40 ring-1 ring-[#e01a1b]/20'
                                                                : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <div className="relative w-11 h-11 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shrink-0">
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
                                                                    <Package className="w-5 h-5 text-slate-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="flex-1 text-sm font-semibold text-slate-900 break-words">
                                                            {item.name || item.productName}
                                                        </p>
                                                        {reviewableItems.length > 1 && (
                                                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-[#e01a1b]' : 'border-slate-300'}`}>
                                                                {selected && <span className="h-2 w-2 rounded-full bg-[#e01a1b]" />}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Product rating */}
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                            How was the product?
                                        </label>
                                        <div className="py-2">
                                            <FacePicker value={rating} onChange={(v: FaceValue) => setRating(v)} />
                                        </div>
                                    </div>

                                    {/* Product comment */}
                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                            Your Review <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value.slice(0, 500))}
                                            rows={3}
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15 resize-none text-sm bg-white placeholder:text-slate-400"
                                            placeholder="What did you like or dislike about this product?"
                                        />
                                        <p className="text-right text-[11px] text-slate-400 mt-1">{comment.length}/500</p>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            {hasProductSection && showExperience && <div className="border-t border-dashed border-slate-200" />}

                            {/* ===== Purchase experience feedback (every order) ===== */}
                            {showExperience && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="grid h-6 w-6 place-items-center rounded-full bg-red-50 text-[#e01a1b]"><Truck className="w-3.5 h-3.5" /></span>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">Purchase Experience</h3>
                                            <p className="text-[11px] text-slate-500">Delivery, packaging & your overall M2C experience</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                            How was your experience with M2C?
                                        </label>
                                        <div className="py-2">
                                            <FacePicker value={expRating} onChange={(v: FaceValue) => setExpRating(v)} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">
                                            Your Feedback <span className="text-slate-400 font-normal normal-case tracking-normal">(optional)</span>
                                        </label>
                                        <textarea
                                            value={expComment}
                                            onChange={(e) => setExpComment(e.target.value.slice(0, 500))}
                                            rows={3}
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15 resize-none text-sm bg-white placeholder:text-slate-400"
                                            placeholder="How was the delivery, packaging and overall service?"
                                        />
                                        <p className="text-right text-[11px] text-slate-400 mt-1">{expComment.length}/500</p>
                                    </div>
                                </div>
                            )}

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
                                disabled={loading || !canSubmit}
                                className="btn-shine w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#e01a1b] text-white rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-[0_6px_20px_rgba(224,26,27,0.3)] text-sm"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {loading ? 'Submitting...' : 'Submit'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
