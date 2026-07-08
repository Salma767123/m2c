import VendorPanel from '@/components/VendorHub/VendorPanel/VendorPanel';
import VendorHeader from '@/components/VendorHub/VendorHeader/VendorHeader';
import VendorFooter from '@/components/VendorHub/VendorFooter/VendorFooter';

// Fallback shown only if VendorPanel fails to import. Defined at module scope —
// defining components inside a render function remounts their subtree on
// every render (react/no-unstable-nested-components).
const ImportFallback = () => (
  <div className="min-h-screen flex flex-col">
    <VendorHeader />
    <main className="grow bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Vendor Registration</h1>
        <p className="text-gray-600">Testing component loading...</p>
      </div>
    </main>
    <VendorFooter />
  </div>
);

export default function VendorRegistrationPage() {
  // Check if VendorPanel is properly imported
  if (!VendorPanel || typeof VendorPanel !== 'function') {
    console.error('VendorPanel is not properly imported:', VendorPanel);
    return <ImportFallback />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <VendorHeader />
      <main className="grow">
        <VendorPanel />
      </main>
      <VendorFooter />
    </div>
  );
}