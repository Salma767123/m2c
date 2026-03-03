import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Shield, Eye, Lock, Users, Mail } from 'lucide-react-native';

export default function Privacy() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white rounded-2xl shadow-lg m-4 p-6">
        <View className="items-center mb-8">
          <View className="w-16 h-16 items-center justify-center mb-4">
            <Shield size={48} color="#212121" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 text-center">Privacy Policy</Text>
          <Text className="text-gray-600 mt-2">Last updated: December 2024</Text>
        </View>

        <View className="space-y-8 gap-8">
          {/* Information We Collect */}
          <View>
            <View className="flex-row items-center mb-4">
              <Eye size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">
                Information We Collect
              </Text>
            </View>
            <Text className="text-gray-700 mb-4 leading-6">
              We collect information you provide directly to us, such as when you create an
              account, make a purchase, or contact us for support.
            </Text>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Personal information (name, email, phone number)
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Payment information (processed securely through third-party providers)
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">Shipping and billing addresses</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">Purchase history and preferences</Text>
              </View>
            </View>
          </View>

          {/* How We Use Your Information */}
          <View>
            <View className="flex-row items-center mb-4">
              <Lock size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">
                How We Use Your Information
              </Text>
            </View>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">Process and fulfill your orders</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Communicate with you about your purchases
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">Provide customer support</Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Send promotional emails (with your consent)
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  Improve our services and user experience
                </Text>
              </View>
            </View>
          </View>

          {/* Information Sharing */}
          <View>
            <View className="flex-row items-center mb-4">
              <Users size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Information Sharing</Text>
            </View>
            <Text className="text-gray-700 mb-4 leading-6">
              We do not sell, trade, or rent your personal information to third parties. We may
              share your information only in the following circumstances:
            </Text>
            <View className="space-y-2 gap-2">
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  With service providers who help us operate our business
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  When required by law or to protect our rights
                </Text>
              </View>
              <View className="flex-row items-start">
                <Text className="text-gray-700 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">
                  In connection with a business transfer or merger
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Us */}
          <View>
            <View className="flex-row items-center mb-4">
              <Mail size={24} color="#212121" />
              <Text className="text-xl font-bold text-gray-900 ml-3">Contact Us</Text>
            </View>
            <Text className="text-gray-700 mb-4 leading-6">
              If you have any questions about this Privacy Policy, please contact us at:
            </Text>
            <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <Text className="text-gray-700 mb-2">Email: privacy@yourstore.com</Text>
              <Text className="text-gray-700">Phone: (555) 123-4567</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
