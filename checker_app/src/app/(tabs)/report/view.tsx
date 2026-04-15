import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useRouter } from 'expo-router';
import { ViewReport } from '@/components/Report/ViewReport';

export default function ReportViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <ViewReport
      reportId={id || ''}
      onBack={handleBack}
    />
  );
}
