'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '../../mockData/orders';

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSubmitReview: (reviewData: AdminReviewData) => void;
}

export interface AdminReviewData {
  reviewComments: string;
  qualityCheckNotes: string;
  rating: number;
  approved: boolean;
  rejectionReason?: string;
}

const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmitReview
}) => {
  const [reviewData, setReviewData] = useState<AdminReviewData>({
    reviewComments: '',
    qualityCheckNotes: '',
    rating: 5,
    approved: true,
    rejectionReason: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmitReview(reviewData);
      onClose();
      // Reset form
      setReviewData({
        reviewComments: '',
        qualityCheckNotes: '',
        rating: 5,
        approved: true,
        rejectionReason: ''
      });
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalChange = (approved: boolean) => {
    setReviewData(prev => ({
      ...prev,
      approved,
      rejectionReason: approved ? '' : prev.rejectionReason
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin Quality Review</h2>
              <p className="text-gray-600">Order ID: {order.orderId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customer:</span>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <span className="text-gray-600">Total Amount:</span>
                <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-gray-600">Items:</span>
                <p className="font-medium">{order.items.length} item(s)</p>
              </div>
              <div>
                <span className="text-gray-600">Vendor:</span>
                <p className="font-medium">{order.items[0]?.vendorName}</p>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Products to Review</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-600">
                      SKU: {item.sku} | Qty: {item.quantity}
                      {item.size && ` | Size: ${item.size}`}
                      {item.color && ` | Color: ${item.color}`}
                    </p>
                    <p className="text-sm font-medium text-gray-900">${item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Review Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Comments
              </label>
              <textarea
                value={reviewData.reviewComments}
                onChange={(e) => setReviewData(prev => ({ ...prev, reviewComments: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your overall review comments..."
                required
              />
            </div>

            {/* Quality Check Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Check Notes
              </label>
              <textarea
                value={reviewData.qualityCheckNotes}
                onChange={(e) => setReviewData(prev => ({ ...prev, qualityCheckNotes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed quality check observations..."
                required
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Rating (1-5)
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    className={`w-8 h-8 ${
                      star <= reviewData.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  >
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {reviewData.rating} star{reviewData.rating !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Approval Decision */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Approval Decision
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="approval"
                    checked={reviewData.approved}
                    onChange={() => handleApprovalChange(true)}
                    className="mr-3 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-green-700 font-medium">✅ Approve - Ship to Customer</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="approval"
                    checked={!reviewData.approved}
                    onChange={() => handleApprovalChange(false)}
                    className="mr-3 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-red-700 font-medium">❌ Reject - Return to Vendor</span>
                </label>
              </div>
            </div>

            {/* Rejection Reason (if rejected) */}
            {!reviewData.approved && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={reviewData.rejectionReason}
                  onChange={(e) => setReviewData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Please provide detailed reason for rejection..."
                  required
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                  reviewData.approved
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Submitting...' : (reviewData.approved ? 'Approve Order' : 'Reject Order')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewModal;