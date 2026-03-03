import React from "react";
import { View, TouchableOpacity, ScrollView, Text } from "react-native";
import { Stack, router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import Terms from "@/components/WebSite/Terms/Terms";

export default function TermsPage() {
  return (
    <>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => router.back()} className="mr-3">
                <ArrowLeft size={24} color="#111827" />
              </TouchableOpacity>
              <Text className="text-xl font-bold text-gray-800">
                Terms of Service
              </Text>
            </View>
          </View>
        </View>
        <Terms />
      </ScrollView>
    </>
  );
}
