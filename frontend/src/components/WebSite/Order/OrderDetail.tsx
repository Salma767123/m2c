"use client"

// OrderDetail component for displaying individual order information
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { 
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Star,
  Heart,
  ShoppingCart,
  Calendar,
  MapPin,
  CreditCard,
  Eye,
  Plus,
  Minus,
  Download,
  MessageCircle
} from "lucide-react"
import { products } from "@/components/mockData/products"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/UI/Card"

interface OrderDetailProps {
  orderId: string
}

// Mock function to get order data by ID using actual product data
const getOrderById = (id: string) => {
  const orders = {
    "ORD-2024-001234": {
      id: "ORD-2024-001234",
      date: "January 15, 2024",
      status: "Processing",
      statusColor: "yellow",
      estimatedDelivery: "January 22-24, 2024",
      shippingAddress: {
        name: "John Doe",
        address: "123 Main Street",
        city: "New York, NY 10001",
        phone: "+1 (555) 123-4567"
      },
      paymentMethod: "•••• •••• •••• 1234",
      subtotal: 465.96,
      shipping: 0,
      tax: 37.28,
      total: 503.24,
      items: [
        {
          id: 1,
          name: products[0].name,
          image: products[0].images[0],
          price: products[0].price,
          quantity: 2,
          size: products[0].dimensions || "Standard",
          color: "Natural",
          category: products[0].category
        },
        {
          id: 2,
          name: products[1].name,
          image: products[1].images[0],
          price: products[1].price,
          quantity: 1,
          size: products[1].dimensions || "One Size",
          color: "Natural Linen",
          category: products[1].category
        },
        {
          id: 3,
          name: products[2].name,
          image: products[2].images[0],
          price: products[2].price,
          quantity: 3,
          size: products[2].dimensions || "Standard",
          color: "Natural",
          category: products[2].category
        }
      ]
    },
    "ORD-2024-001233": {
      id: "ORD-2024-001233",
      date: "January 10, 2024",
      status: "Delivered",
      statusColor: "green",
      estimatedDelivery: "Delivered on January 12, 2024",
      shippingAddress: {
        name: "John Doe",
        address: "123 Main Street",
        city: "New York, NY 10001",
        phone: "+1 (555) 123-4567"
      },
      paymentMethod: "•••• •••• •••• 1234",
      subtotal: 251.97,
      shipping: 0,
      tax: 20.16,
      total: 272.13,
      items: [
        {
          id: 3,
          name: products[2].name,
          image: products[2].images[0],
          price: products[2].price,
          quantity: 3,
          size: products[2].dimensions || "Standard",
          color: "Natural",
          category: products[2].category
        },
        {
          id: 4,
          name: products[5].name,
          image: products[5].images[0],
          price: products[5].price,
          quantity: 1,
          size: products[5].dimensions || "Bath Size",
          color: "White",
          category: products[5].category
        }
      ]
    }
  }
  
  return orders[id as keyof typeof orders] || null
}

// Related products using actual product data
const relatedProducts = [
  {
    id: parseInt(products[3].id),
    name: products[3].name,
    image: products[3].images[0],
    price: products[3].price,
    originalPrice: products[3].originalPrice,
    rating: products[3].rating,
    reviews: products[3].reviews,
    category: products[3].category
  },
  {
    id: parseInt(products[4].id),
    name: products[4].name,
    image: products[4].images[0],
    price: products[4].price,
    originalPrice: products[4].originalPrice,
    rating: products[4].rating,
    reviews: products[4].reviews,
    category: products[4].category
  },
  {
    id: parseInt(products[6].id),
    name: products[6].name,
    image: products[6].images[0],
    price: products[6].price,
    originalPrice: products[6].originalPrice,
    rating: products[6].rating,
    reviews: products[6].reviews,
    category: products[6].category
  },
  {
    id: parseInt(products[7].id),
    name: products[7].name,
    image: products[7].images[0],
    price: products[7].price,
    originalPrice: products[7].originalPrice,
    rating: products[7].rating,
    reviews: products[7].reviews,
    category: products[7].category
  }
]

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [quantities, setQuantities] = useState<{[key: number]: number}>({})
  const orderDetails = getOrderById(orderId)

  const updateQuantity = (productId: number, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + change)
    }))
  }

  const getQuantity = (productId: number) => quantities[productId] || 1

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border p-12 text-center">
            <CardContent>
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Order Not Found</h3>
              <p className="text-slate-600 mb-6">The order you're looking for doesn't exist or has been removed.</p>
              <Link href="/order">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
                  Back to Orders
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-8 font-sans">
      <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/order">
            <button className="flex items-center gap-2 text-white bg-[#222222] p-3 rounded-md mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Orders
            </button>
          </Link>
       

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
             {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Order Details</h1>
              <p className="text-slate-600">Order #{orderDetails.id}</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-2 rounded-full p-2 text-base font-medium ${
                orderDetails.statusColor === "green" ? "bg-green-100 text-green-800" :
                orderDetails.statusColor === "yellow" ? "bg-yellow-100 text-yellow-800" :
                orderDetails.statusColor === "blue" ? "bg-blue-100 text-blue-800" :
                "bg-red-100 text-red-800"
              }`}>
                <Package className="w-4 h-4 mr-1" />
                {orderDetails.status}
              </div>
            </div>
          </div>
        </div>
            {/* Order Status Timeline */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-green-600">Confirmed</span>
                    <span className="text-xs text-slate-500">Jan 15</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-4 ${
                    orderDetails.status === "Processing" || orderDetails.status === "Shipped" || orderDetails.status === "Delivered" 
                      ? "bg-yellow-300" : "bg-slate-300"
                  }`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      orderDetails.status === "Processing" || orderDetails.status === "Shipped" || orderDetails.status === "Delivered"
                        ? "bg-yellow-500" : "bg-slate-300"
                    }`}>
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${
                      orderDetails.status === "Processing" || orderDetails.status === "Shipped" || orderDetails.status === "Delivered"
                        ? "text-yellow-600" : "text-slate-500"
                    }`}>Processing</span>
                    <span className="text-xs text-slate-500">
                      {orderDetails.status === "Processing" ? "Current" : orderDetails.status === "Shipped" || orderDetails.status === "Delivered" ? "Complete" : "Pending"}
                    </span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-4 ${
                    orderDetails.status === "Shipped" || orderDetails.status === "Delivered" 
                      ? "bg-blue-300" : "bg-slate-300"
                  }`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      orderDetails.status === "Shipped" || orderDetails.status === "Delivered"
                        ? "bg-blue-500" : "bg-slate-300"
                    }`}>
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${
                      orderDetails.status === "Shipped" || orderDetails.status === "Delivered"
                        ? "text-blue-600" : "text-slate-500"
                    }`}>Shipped</span>
                    <span className="text-xs text-slate-500">
                      {orderDetails.status === "Shipped" ? "Current" : orderDetails.status === "Delivered" ? "Complete" : "Pending"}
                    </span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-4 ${
                    orderDetails.status === "Delivered" ? "bg-green-300" : "bg-slate-300"
                  }`}></div>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      orderDetails.status === "Delivered" ? "bg-green-500" : "bg-slate-300"
                    }`}>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${
                      orderDetails.status === "Delivered" ? "text-green-600" : "text-slate-500"
                    }`}>Delivered</span>
                    <span className="text-xs text-slate-500">
                      {orderDetails.status === "Delivered" ? "Complete" : "Pending"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ordered Items */}
            <Card className="border overflow-hidden">
              <CardHeader className="border-b bg-slate-50">
                <CardTitle className="text-xl">Ordered Items</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {orderDetails.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                      <div className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{item.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                          <span>Size: {item.size}</span>
                          <span>Color: {item.color}</span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-slate-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <span className="text-sm text-slate-500">
                            ${item.price.toFixed(2)} each
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex flex-wrap gap-3">
                    {orderDetails.status !== "Delivered" && orderDetails.status !== "Cancelled" && (
                      <button className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                        <Eye className="w-4 h-4" />
                        Track Order
                      </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
                      <Download className="w-4 h-4" />
                      Download Invoice / Packing List
                    </button>
                    <button className="flex items-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      Contact Support
                    </button>
                    {orderDetails.status === "Delivered" && (
                      <Link href="/checkout">
                        <button className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                          <Package className="w-4 h-4" />
                          Reorder Items
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <Card className="border overflow-hidden sticky top-8">
              <CardHeader className="border-b bg-slate-100">
                <CardTitle className="text-xl">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">${orderDetails.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax</span>
                  <span className="font-medium">${orderDetails.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${orderDetails.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card className="border overflow-hidden">
              <CardHeader className="border-b bg-slate-100">
                <CardTitle className="text-xl">Delivery Info</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {orderDetails.status === "Delivered" ? "Delivered" : "Estimated Delivery"}
                    </p>
                    <p className="text-sm text-slate-600">{orderDetails.estimatedDelivery}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Shipping Address</p>
                    <div className="text-sm text-slate-600">
                      <p>{orderDetails.shippingAddress.name}</p>
                      <p>{orderDetails.shippingAddress.address}</p>
                      <p>{orderDetails.shippingAddress.city}</p>
                      <p>{orderDetails.shippingAddress.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-slate-900">Payment Method</p>
                    <p className="text-sm text-slate-600">{orderDetails.paymentMethod}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Products - Separate Bottom Section */}
        <div className="mt-12">
          <Card className="border overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="text-2xl">You Might Also Like</CardTitle>
              <CardDescription>Products similar to your order</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((product) => (
                  <div key={product.id} className="group border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-slate-300">
                    <div className="relative mb-4">
                      <div className="relative w-full h-64 bg-slate-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors">
                        <Heart className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(product.rating)
                                  ? "text-yellow-400 fill-current"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-600">
                          {product.rating} ({product.reviews})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-slate-500 line-through">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <button className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}