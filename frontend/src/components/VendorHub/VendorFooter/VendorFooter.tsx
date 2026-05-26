import React from 'react';

const VendorFooter = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="font-sans text-xs sm:text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} M2C MarkDowns Private Limited. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default VendorFooter;