import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import {
  FileText,
  Scale,
  AlertTriangle,
  CreditCard,
  Truck,
  RefreshCw,
} from 'lucide-react-native';

export default function Terms() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white rounded-2xl shadow-lg m-4 p-6">
        <View className="items-center mb-8">
          <View className="w-16 h-16 items-center justify-center mb-4">
            <Scale size={48} color="#212121" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">Terms of Service</Text>
          <Text className="text-gray-600 mt-2">Last updated: December 2024</Text>
        </View>

        <View className="space-y-8 gap-8">
          {/* Acceptance of Terms */}
          <View>
            <View className="flex-row items-center mb-4">
              <FileText size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Acceptance of Terms</Text>
            </View>
            <Text className="text-gray-700 leading-6">
              By accessing and using this website, you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to abide by the above, please do
              not use this service.
            </Text>
          </View>

          {/* Payment Terms */}
          <View>
            <View className="flex-row items-center mb-4">
              <CreditCard size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Payment Terms</Text>
            </View>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  All prices are listed in USD and are subject to change without notice
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">Payment is due at the time of purchase</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  We accept major credit cards and PayPal
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  All transactions are processed securely
                </Text>
              </View>
            </View>
          </View>

          {/* Shipping and Delivery */}
          <View>
            <View className="flex-row items-center mb-4">
              <Truck size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Shipping and Delivery</Text>
            </View>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  We ship to addresses within the United States
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Delivery times vary by location and shipping method selected
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Risk of loss passes to you upon delivery to the carrier
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  We are not responsible for delays caused by shipping carriers
                </Text>
              </View>
            </View>
          </View>

          {/* Returns and Refunds */}
          <View>
            <View className="flex-row items-center mb-4">
              <RefreshCw size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Returns and Refunds</Text>
            </View>
            <Text className="text-gray-700 leading-6">
              Please refer to our Returns Policy for detailed information about returns, exchanges,
              and refunds.
            </Text>
          </View>

          {/* Limitation of Liability */}
          <View>
            <View className="flex-row items-center mb-4">
              <AlertTriangle size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">
                Limitation of Liability
              </Text>
            </View>
            <Text className="text-gray-700 leading-6">
              In no event shall our company be liable for any direct, indirect, punitive,
              incidental, special, consequential damages or any damages whatsoever including,
              without limitation, damages for loss of use, data or profits, arising out of or in
              any way connected with the use or performance of the website.
            </Text>
          </View>

          {/* Governing Law */}
          <View>
            <View className="flex-row items-center mb-4">
              <Scale size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Governing Law</Text>
            </View>
            <Text className="text-gray-700 leading-6">
              These terms and conditions are governed by and construed in accordance with the laws
              of the United States and you irrevocably submit to the exclusive jurisdiction of the
              courts in that State or location.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
