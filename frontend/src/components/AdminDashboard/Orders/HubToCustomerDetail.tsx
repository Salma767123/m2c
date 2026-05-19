"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Package, CreditCard, User, MapPin, Truck, Star, CheckCircle, XCircle, AlertTriangle, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { orderService, Order, VendorShipment } from "@/services/orderService";
import { hasPermission } from "@/lib/auth";
import { getCountryName, getStateName, formatPhoneForDisplay } from "@/components/WebSite/CheckOut/CheckoutProcess/constants";

interface HubToCustomerDetailProps {
  orderId: string;
}

export default function HubToCustomerDetail({ orderId }: HubToCustomerDetailProps) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAdminOrderById(orderId);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to load order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await orderService.updateAdminOrderStatus(orderId, newStatus);
      if (res.success) {
        showSuccessToast(`Order marked as ${newStatus.replace(/_/g, " ")}`);
        setOrder(res.data);
        if (newStatus === "DELIVERED") {
          setTimeout(() => {
            router.push("/admin/dashboard/orders/hub-to-customer");
          }, 1500);
        }
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to update order status");
    }
  };

  const handleMarkOutForDelivery = () => {
    handleUpdateStatus("SHIPPED_TO_CUSTOMER");
  };

  const handleMarkAsDelivered = () => {
    handleUpdateStatus("DELIVERED");
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading order details...</div>;
  }

  if (!order) {
    return <div className="p-6 text-center text-red-500">Order not found</div>;
  }

  const { status } = order;

  // Check shipment readiness for multi-vendor orders
  const shipments = order.shipments || [];
  const hasShipments = shipments.length > 0;
  const terminalStatuses = new Set(['CANCELLED', 'RETURNED']);
  const nonTerminalShipments = shipments.filter((s) => !terminalStatuses.has(s.status));
  const nonCancelledShipments = nonTerminalShipments;
  const allShipmentsApproved = hasShipments && nonTerminalShipments.every((s) => s.status === 'APPROVED_BY_ADMIN_HUB');
  const hasRejectedShipment = nonCancelledShipments.some((s) => s.status === 'REJECTED_BY_ADMIN_HUB');
  const canShipToCustomer = !hasShipments || allShipmentsApproved;

  // Shipment progress counts — used by the banner and by the inline status sub-text
  // so admin sees blockers / progress without having to scroll to the Vendor Shipments
  // section at the bottom of the page.
  const approvedCount = nonCancelledShipments.filter((s) => s.status === 'APPROVED_BY_ADMIN_HUB').length;
  const totalShipmentCount = nonCancelledShipments.length;
  const atVendorCount = nonCancelledShipments.filter((s) =>
    ['ORDER_CREATED', 'VENDOR_PROCESSING', 'PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'].includes(s.status),
  ).length;
  const atHubAwaitingReviewCount = nonCancelledShipments.filter((s) => s.status === 'RECEIVED_AT_ADMIN_HUB').length;
  const rejectedShipmentCount = nonCancelledShipments.filter((s) => s.status === 'REJECTED_BY_ADMIN_HUB').length;
  const isTerminal = status === 'CANCELLED' || status === 'RETURNED';
  const canMarkOutForDelivery = ['RECEIVED_AT_ADMIN_HUB', 'APPROVED_BY_ADMIN_HUB'].includes(status) && canShipToCustomer && !hasRejectedShipment;
  // Show the "Mark Out for Delivery" affordance for any pre-shipped, non-terminal state so
  // admin sees the next action up front. Disabled state + tooltip explains the blocker.
  const showOutForDeliveryButton = !isTerminal && status !== 'SHIPPED_TO_CUSTOMER' && status !== 'DELIVERED';

  // Build the action banner shown at the top of the page. One source of truth for what
  // state the order is in and what the admin should do next. Tone drives color scheme.
  type BannerTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  const buildActionBanner = (): { tone: BannerTone; title: string; message: string } | null => {
    if (status === 'DELIVERED') {
      return { tone: 'success', title: 'Order delivered', message: 'This order has been delivered to the customer. The lifecycle is complete.' };
    }
    if (status === 'SHIPPED_TO_CUSTOMER') {
      return { tone: 'info', title: 'Out for delivery', message: 'Mark this order as delivered once the customer receives it.' };
    }
    if (status === 'CANCELLED') {
      return { tone: 'neutral', title: 'Order cancelled', message: 'No further actions are available for this order.' };
    }
    if (status === 'RETURNED') {
      return { tone: 'neutral', title: 'Order returned', message: 'This order was returned. No further delivery actions are available.' };
    }
    if (rejectedShipmentCount > 0) {
      return {
        tone: 'danger',
        title: 'Vendor shipment rejected',
        message: `${rejectedShipmentCount} of ${totalShipmentCount} vendor shipment(s) were rejected. Resolve them (reinspection or replacement) before shipping to the customer.`,
      };
    }
    if (hasShipments && allShipmentsApproved && status !== 'SHIPPED_TO_CUSTOMER') {
      return {
        tone: 'success',
        title: 'Ready to ship to customer',
        message: `All ${totalShipmentCount} vendor shipment(s) approved at the hub. Click "Mark Out for Delivery" to send the order to the customer.`,
      };
    }
    if (atHubAwaitingReviewCount > 0 && atVendorCount === 0) {
      return {
        tone: 'warning',
        title: 'Vendor shipments awaiting approval',
        message: `${approvedCount} of ${totalShipmentCount} shipment(s) approved. ${atHubAwaitingReviewCount} received at hub and pending review — approve them in Vendor Shipments below to enable delivery.`,
      };
    }
    if (atVendorCount > 0) {
      return {
        tone: 'warning',
        title: 'Waiting for vendor shipments',
        message: `${approvedCount} of ${totalShipmentCount} vendor shipment(s) approved. ${atVendorCount} still with the vendor or in transit to the hub — delivery unavailable until they arrive.`,
      };
    }
    return null;
  };
  const actionBanner = buildActionBanner();

  const bannerToneClasses: Record<BannerTone, { wrap: string; title: string; message: string; iconColor: string }> = {
    success: { wrap: 'bg-green-50 border-green-200', title: 'text-green-900', message: 'text-green-800', iconColor: 'text-green-600' },
    warning: { wrap: 'bg-amber-50 border-amber-200', title: 'text-amber-900', message: 'text-amber-800', iconColor: 'text-amber-600' },
    danger: { wrap: 'bg-red-50 border-red-200', title: 'text-red-900', message: 'text-red-800', iconColor: 'text-red-600' },
    info: { wrap: 'bg-blue-50 border-blue-200', title: 'text-blue-900', message: 'text-blue-800', iconColor: 'text-blue-600' },
    neutral: { wrap: 'bg-gray-50 border-gray-200', title: 'text-gray-900', message: 'text-gray-700', iconColor: 'text-gray-500' },
  };
  const renderBannerIcon = (tone: BannerTone) => {
    const cls = `h-5 w-5 ${bannerToneClasses[tone].iconColor}`;
    if (tone === 'success') return <CheckCircle className={cls} />;
    if (tone === 'warning') return <AlertTriangle className={cls} />;
    if (tone === 'danger') return <XCircle className={cls} />;
    if (tone === 'info') return <Truck className={cls} />;
    return <Package className={cls} />;
  };

  // Tooltip text for the disabled "Mark Out for Delivery" button — same source of truth
  // as the banner message so admins get consistent reasoning whether they hover or read.
  const outForDeliveryBlockerReason = (() => {
    if (status === 'VENDOR_PROCESSING' || status === 'ORDER_CREATED' || status === 'PACKED_BY_VENDOR' || status === 'IN_TRANSIT_TO_ADMIN_HUB') {
      return 'Order is still with the vendor or in transit — waiting for it to arrive at the hub.';
    }
    if (hasRejectedShipment) return 'One or more vendor shipments are rejected. Resolve them before shipping.';
    if (!canShipToCustomer) return 'All vendor shipments must be approved at the hub before delivery.';
    return '';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hub to Customer Order</h1>
            <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {showOutForDeliveryButton && hasPermission('edit_orders') && (
            <button
              onClick={handleMarkOutForDelivery}
              disabled={!canMarkOutForDelivery}
              className={`px-6 py-2 rounded-lg transition-colors font-medium ${canMarkOutForDelivery
                ? "bg-orange-600 text-white hover:bg-orange-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
              title={!canMarkOutForDelivery ? outForDeliveryBlockerReason : ""}
            >
              Mark Out for Delivery
            </button>
          )}
          {status === "SHIPPED_TO_CUSTOMER" && hasPermission('edit_orders') && (
            <button
              onClick={handleMarkAsDelivered}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Mark as Delivered
            </button>
          )}
          {status === "DELIVERED" && (
            <div className="px-6 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-300">
              Order Delivered
            </div>
          )}
        </div>
      </div>

      {/* Action / Status Banner — single source of truth at the top of the page so
          admins see the current blocker and next action without scrolling. */}
      {actionBanner && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-4 flex items-start gap-3 ${bannerToneClasses[actionBanner.tone].wrap}`}
        >
          <div className="shrink-0 mt-0.5">{renderBannerIcon(actionBanner.tone)}</div>
          <div className="min-w-0 flex-1">
            <h3 className={`text-sm font-semibold ${bannerToneClasses[actionBanner.tone].title}`}>
              {actionBanner.title}
            </h3>
            <p className={`text-sm mt-0.5 ${bannerToneClasses[actionBanner.tone].message}`}>
              {actionBanner.message}
            </p>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Order Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className={`text-base font-medium mt-1 ${["RECEIVED_AT_ADMIN_HUB", "APPROVED_BY_ADMIN_HUB"].includes(status) ? "text-teal-600" :
              status === "SHIPPED_TO_CUSTOMER" ? "text-orange-600" :
                status === "DELIVERED" ? "text-green-600" : "text-gray-600"
              }`}>
              {status.replace(/_/g, " ")}
            </p>
            {hasShipments && !isTerminal && status !== 'DELIVERED' && (
              <p className="text-xs text-gray-500 mt-1">
                {approvedCount} of {totalShipmentCount} vendor shipment{totalShipmentCount === 1 ? '' : 's'} approved
              </p>
            )}
          </div>
          {/* TODO: Uncomment when tracking reference feature is implemented
          <div>
            <p className="text-sm text-gray-600">Tracking Ref</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              {order.trackingReference || "N/A"}
            </p>
          </div>
          */}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Subtotal</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.subtotal?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tax</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.tax?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Shipping</p>
            <p className="text-base font-medium text-gray-900 mt-1">
              ₹{order.shippingCost?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Discount</p>
            <p className="text-base font-medium text-green-600 mt-1">
              -₹{order.discount?.toLocaleString() || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              ₹{order.totalAmount?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h2>
        <div className="space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-4 p-4 border border-gray-100 rounded-lg">
              <img
                src={item.productImage || "/assets/images/placeholder.jpg"}
                alt={item.productName}
                className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">{item.productName}</h3>
                <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                {(item.size || item.color) && (
                  <div className="flex items-center gap-2 mt-1">
                    {item.size && <p className="text-sm text-gray-600">Size: {item.size}</p>}
                    {item.size && item.color && <span className="text-gray-300">|</span>}
                    {item.color && (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-600">Color:</p>
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                          style={{ backgroundColor: item.colorHex || item.color }}
                          title={item.color}
                        />
                        <span className="text-xs text-gray-500 capitalize">{item.color}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-base font-medium text-gray-900">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Price</p>
                    <p className="text-base font-medium text-gray-900">
                      ₹{item.unitPrice?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Price</p>
                    <p className="text-base font-medium text-gray-900">
                      ₹{item.totalPrice?.toLocaleString() || (item.unitPrice * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bag Add-on */}
      {order.bagTypeName && order.bagTypePrice && order.bagTypePrice > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Bag Add-on</h2>
          </div>
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <ShoppingBag className="h-8 w-8 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{order.bagTypeName}</p>
              <p className="text-sm text-gray-600 mt-0.5">Customer requested this bag with their order</p>
            </div>
            <p className="text-lg font-bold text-gray-900 shrink-0">₹{order.bagTypePrice.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Payment Method</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentMethod}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="text-base font-medium text-gray-900 mt-1">{order.paymentId || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p className="text-base font-medium text-green-600 mt-1">{order.paymentStatus}</p>
          </div>
        </div>
      </div>

      {/* Customer Details — unified layout shared with VendorToHubDetail and OrderDetail */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Customer Info</h3>
            <p className="text-sm text-gray-600">{order.customerName}</p>
            <p className="text-sm text-gray-600">{order.customerEmail}</p>
            {order.customerPhone && (
              <p className="text-sm text-gray-600">{formatPhoneForDisplay(order.customerPhone, order?.shippingAddress?.country)}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Delivery Address</h3>
            <div className="text-sm text-gray-600">
              {order?.shippingAddress ? (
                <>
                  {(() => {
                    const a = order.shippingAddress;
                    const recipient = a.firstName && a.lastName
                      ? `${a.firstName} ${a.lastName}`
                      : a.firstName || a.name || "";
                    return recipient ? (
                      <p className="font-medium text-gray-900">{recipient}</p>
                    ) : null;
                  })()}
                  <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                  {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                  <p>
                    {order.shippingAddress.city}, {getStateName(order.shippingAddress.state ?? "", order.shippingAddress.country)} {order.shippingAddress.zipCode || order.shippingAddress.postalCode}
                  </p>
                  <p>{getCountryName(order.shippingAddress.country)}</p>
                </>
              ) : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Hub Location */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Hub Information</h2>
        </div>
        <div className="bg-teal-50 border border-teal-200 p-4 rounded-lg">
          <p className="text-sm text-teal-800">
            Order processing from <span className="font-semibold">{order.hub?.name || "Admin Central Hub"}</span>
          </p>
        </div>
      </div>

      {/* Vendor Shipments Summary */}
      {hasShipments && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Vendor Shipments</h2>
            <span className="text-sm text-gray-500 ml-auto">
              {nonCancelledShipments.filter((s) => s.status === 'APPROVED_BY_ADMIN_HUB').length}/{nonCancelledShipments.length} approved
            </span>
          </div>
          {hasRejectedShipment && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                One or more vendor shipments were rejected. Resolve before shipping to customer.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {shipments.map((s) => {
              const reviewData = (s as VendorShipment & { adminReviews?: Array<{ approved?: boolean; rating?: number }> }).adminReviews?.[0];
              return (
                <div key={s.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                  {s.status === 'APPROVED_BY_ADMIN_HUB' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  ) : s.status === 'REJECTED_BY_ADMIN_HUB' ? (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  ) : s.status === 'CANCELLED' ? (
                    <XCircle className="h-5 w-5 text-gray-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{s.vendorName}</p>
                    <p className="text-xs text-gray-500">
                      {s.items?.length || 0} item{(s.items?.length || 0) !== 1 ? 's' : ''} &middot; {s.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {s.vendorCarrier && (
                    <p className="text-xs text-gray-500 shrink-0">
                      {s.vendorCarrier}: {s.vendorTrackingId}
                    </p>
                  )}
                  {reviewData?.approved && typeof reviewData.rating === 'number' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-gray-700">{reviewData.rating}/5</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delivery Instructions */}
      {status !== "DELIVERED" && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Delivery Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Verify customer identity before delivery</li>
            <li>Ensure product is in good condition</li>
            <li>Get customer signature or confirmation</li>
            <li>Update delivery status immediately after handover</li>
            <li>Contact customer if delivery address is unclear</li>
          </ul>
        </div>
      )}

      {/* Delivery Completed Message */}
      {status === "DELIVERED" && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-sm font-semibold text-green-900 mb-2">Order Delivered Successfully</h3>
          <p className="text-sm text-green-800">
            This order has been successfully delivered to the customer. The order lifecycle is now complete.
          </p>
        </div>
      )}
    </div>
  );
}
