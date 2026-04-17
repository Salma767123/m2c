import React from 'react';
import { View, Text } from 'react-native';

/** Label with an optional red asterisk for required fields. */
export function Label({
  children,
  required,
  className = '',
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <Text className={`text-sm font-semibold text-slate-700 mb-1 ${className}`}>
      {children}
      {required ? <Text className="text-red-500"> *</Text> : null}
    </Text>
  );
}

/** Inline error message shown below a field. Hides itself when `msg` is falsy. */
export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <Text className="text-xs font-medium text-red-600 mt-1">{msg}</Text>
  );
}

/** Class string for a bordered field. Red border when invalid. */
export const fieldBorder = (hasError?: boolean | string) =>
  `border rounded-xl px-4 py-3 bg-white ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`;

/** Thinner border variant used inside nested cards (e.g. items list). */
export const compactBorder = (hasError?: boolean | string) =>
  `border rounded-lg px-3 py-2 bg-white ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`;

/** Inline banner shown above a step when it has validation errors. */
export function StepErrorBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4 flex-row items-start">
      <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2 mt-0.5">
        <Text className="text-white text-[10px] font-bold">!</Text>
      </View>
      <Text className="text-xs text-red-700 flex-1 leading-4">
        <Text className="font-bold">
          {count} {count === 1 ? 'field needs' : 'fields need'} your attention.
        </Text>{' '}
        Please review the highlighted fields to continue.
      </Text>
    </View>
  );
}
