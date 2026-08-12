import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MapPin, Video, X } from 'lucide-react-native';

export type InspectionType = 'PHYSICAL' | 'VIRTUAL';

interface Props {
  /** Product name, for context in the heading. */
  subjectName?: string;
  /** Called with the chosen type. The caller then continues the inspection. */
  onSelect: (type: InspectionType) => void;
  /** Called when the checker backs out without choosing. */
  onCancel: () => void;
}

/**
 * Mandatory "how is this inspection being carried out?" dialog, shown the moment
 * a product inspection form opens (mirrors the web InspectionTypeDialog).
 *
 *   • Physical — checker is on-site; photos are taken live with the camera.
 *   • Virtual  — done online; the checker may also upload photos from the gallery.
 *
 * There is no default and no dismiss-without-choosing (the X cancels the whole start),
 * so the checker cannot slip past this decision.
 */
export default function InspectionTypeDialog({ subjectName, onSelect, onCancel }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/40 justify-center px-6">
        <View className="bg-white rounded-2xl overflow-hidden">
          <View className="px-5 pt-5 pb-4 border-b border-slate-100 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">Select Inspection Type</Text>
              <Text className="text-sm text-slate-500 mt-1">
                How are you carrying out
                {subjectName ? (
                  <>
                    {' '}the inspection for <Text className="font-semibold text-slate-700">{subjectName}</Text>
                  </>
                ) : (
                  ' this inspection'
                )}
                ?
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={8} accessibilityLabel="Cancel" className="p-1.5 ml-3">
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View className="p-5" style={{ rowGap: 12 }}>
            <TouchableOpacity
              onPress={() => onSelect('PHYSICAL')}
              activeOpacity={0.8}
              accessibilityRole="button"
              className="rounded-xl border-2 border-slate-200 p-4 flex-row items-center bg-white"
            >
              <View className="w-11 h-11 rounded-lg bg-brand-50 items-center justify-center mr-3">
                <MapPin size={20} color="#e01a1b" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">Physical Inspection</Text>
                <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  On-site visit. Photos are taken live with the camera.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSelect('VIRTUAL')}
              activeOpacity={0.8}
              accessibilityRole="button"
              className="rounded-xl border-2 border-slate-200 p-4 flex-row items-center bg-white"
            >
              <View className="w-11 h-11 rounded-lg bg-brand-50 items-center justify-center mr-3">
                <Video size={20} color="#e01a1b" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">Virtual Inspection</Text>
                <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Online / remote. You may also upload photos from your gallery.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
