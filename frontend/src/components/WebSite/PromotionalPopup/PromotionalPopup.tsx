"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, ArrowRight, Tag } from "lucide-react";
import { couponService, PopupCoupon } from "@/services/couponService";

interface PromotionalPopupProps {
  category: string;
}

export default function PromotionalPopup({ category }: PromotionalPopupProps) {
  const [coupon, setCoupon] = useState<PopupCoupon | null>(null);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!category) return;

    const sessionKey = `popup_shown_${category}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const fetchPopup = async () => {
      const data = await couponService.getPopupCoupon(category);
      if (data) {
        setCoupon(data);
        // Show after 1.5s delay
        setTimeout(() => setVisible(true), 1500);
      }
    };
    fetchPopup();
  }, [category]);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (category) {
      sessionStorage.setItem(`popup_shown_${category}`, "true");
    }
  }, [category]);

  // Close on ESC
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, handleClose]);

  const handleCopy = async () => {
    if (!coupon) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = coupon.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!visible || !coupon) return null;

  const discountText =
    coupon.discountType === "PERCENTAGE"
      ? `${coupon.discountValue}% OFF`
      : `$${coupon.discountValue} OFF`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>

        {/* Image */}
        {coupon.popupImage && (
          <div className="w-full aspect-[16/9] overflow-hidden">
            <img
              src={coupon.popupImage}
              alt={coupon.popupTitle || "Promotional Offer"}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Discount Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-bold">
              <Tag className="w-3.5 h-3.5" />
              {discountText}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {coupon.popupTitle || `${discountText} on ${category}!`}
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-5">
            {coupon.popupMessage || coupon.description || `Use code below to get ${discountText.toLowerCase()} on your purchase.`}
          </p>

          {/* Coupon Code */}
          <div
            onClick={handleCopy}
            className="flex items-center justify-between px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-colors mb-4"
          >
            <span className="text-lg font-mono font-bold text-gray-900 tracking-wider">
              {coupon.code}
            </span>
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Shop Now Button */}
          <button
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#222222] text-white rounded-xl font-semibold hover:bg-[#333333] transition-colors"
          >
            Shop Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
