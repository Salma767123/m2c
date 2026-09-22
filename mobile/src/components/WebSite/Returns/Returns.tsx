import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  RotateCcw,
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';

export default function Returns() {
  return (
    <ScrollView className="flex-1 bg-warm-ground">
      <View className="bg-white rounded-2xl border border-warm-line m-4 p-6">
        <View className="flex-row items-center gap-2 mb-7">
          <RotateCcw size={18} color="#e01a1b" />
          <Text className="font-sans text-xs text-warm-muted">Easy returns within 30 days</Text>
        </View>

        <View className="space-y-8 gap-8">
          {/* Return Policy */}
          <View>
            <View className="flex-row items-center mb-4">
              <Clock size={24} color="#e01a1b" />
              <Text className="text-xl font-sans-bold text-warm-ink ml-3">Return Policy</Text>
            </View>
            <Text className="font-sans text-warm-body mb-4 leading-6">
              We want you to be completely satisfied with your purchase. If you&apos;re not happy with
              your order, you can return it within 30 days of delivery for a full refund.
            </Text>
            <View className="bg-warm-blush border border-warm-blushLine rounded-xl p-4">
              <Text className="text-warm-ink font-sans-bold mb-1">30-Day Return Window</Text>
              <Text className="font-sans text-warm-body text-sm">
                Returns must be initiated within 30 days of delivery date
              </Text>
            </View>
          </View>

          {/* Eligible Items */}
          <View>
            <View className="flex-row items-center mb-4">
              <CheckCircle size={24} color="#16a34a" />
              <Text className="text-xl font-sans-bold text-warm-ink ml-3">Eligible Items</Text>
            </View>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">
                  Items in original condition with tags attached
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Unworn and unwashed clothing</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Electronics in original packaging</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Books in sellable condition</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Home goods without damage</Text>
              </View>
            </View>
          </View>

          {/* Non-Returnable Items */}
          <View>
            <View className="flex-row items-center mb-4">
              <XCircle size={24} color="#6b7280" />
              <Text className="text-xl font-sans-bold text-warm-ink ml-3">Non-Returnable Items</Text>
            </View>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Personalized or customized items</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Perishable goods</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Intimate apparel and swimwear</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Items damaged by misuse</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="font-sans text-warm-body mr-2">•</Text>
                <Text className="font-sans text-warm-body flex-1">Digital downloads</Text>
              </View>
            </View>
          </View>

          {/* How to Return */}
          <View>
            <View className="flex-row items-center mb-4">
              <Package size={24} color="#e01a1b" />
              <Text className="text-xl font-sans-bold text-warm-ink ml-3">How to Return</Text>
            </View>
            <View className="space-y-4 gap-4">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-brand-500 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-sans-bold text-sm">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-warm-ink mb-1">Start Your Return</Text>
                  <Text className="font-sans text-warm-body text-sm leading-5">
                    Contact our customer service or use our online return portal
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-brand-500 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-sans-bold text-sm">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-warm-ink mb-1">Package Your Items</Text>
                  <Text className="font-sans text-warm-body text-sm leading-5">
                    Include all original packaging, tags, and accessories
                  </Text>
                </View>
              </View>
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-brand-500 rounded-full items-center justify-center mr-3">
                  <Text className="text-white font-sans-bold text-sm">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-warm-ink mb-1">Ship It Back</Text>
                  <Text className="font-sans text-warm-body text-sm leading-5">
                    Use the prepaid return label we provide
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Refund Information */}
          <View>
            <View className="flex-row items-center mb-4">
              <AlertCircle size={24} color="#e01a1b" />
              <Text className="text-xl font-sans-bold text-warm-ink ml-3">Refund Information</Text>
            </View>
            <View className="space-y-4 gap-4">
              <View className="bg-warm-ground rounded-xl p-4 border border-warm-line">
                <Text className="font-sans-bold text-warm-ink mb-2">Processing Time</Text>
                <Text className="font-sans text-warm-body text-sm leading-5">
                  Refunds are processed within 5-7 business days after we receive your return
                </Text>
              </View>
              <View className="bg-warm-ground rounded-xl p-4 border border-warm-line">
                <Text className="font-sans-bold text-warm-ink mb-2">Refund Method</Text>
                <Text className="font-sans text-warm-body text-sm leading-5">
                  Refunds are issued to the original payment method used for purchase
                </Text>
              </View>
              <View className="bg-warm-ground rounded-xl p-4 border border-warm-line">
                <Text className="font-sans-bold text-warm-ink mb-2">Return Shipping</Text>
                <Text className="font-sans text-warm-body text-sm leading-5">
                  We provide free return shipping labels for all eligible returns
                </Text>
              </View>
            </View>
          </View>

          {/* Need Help */}
          <View className="bg-warm-blush border border-warm-blushLine rounded-xl p-6">
            <Text className="text-xl font-sans-bold text-warm-ink mb-4">Need Help?</Text>
            <Text className="font-sans text-warm-body mb-4 leading-6">
              Our customer service team is here to help with your return.
            </Text>
            <View className="space-y-2 gap-2">
              <Text className="font-sans text-warm-body">Email: returns@yourstore.com</Text>
              <Text className="font-sans text-warm-body">Phone: (555) 123-4567</Text>
              <Text className="font-sans text-warm-body">Hours: Monday-Friday, 9 AM - 6 PM EST</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
