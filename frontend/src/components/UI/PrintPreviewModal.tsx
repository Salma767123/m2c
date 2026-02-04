'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/UI/Button';
import { X, Printer } from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  title: string;
  onPrint: () => void;
}

export default function PrintPreviewModal({ 
  isOpen, 
  onClose, 
  htmlContent, 
  title, 
  onPrint 
}: PrintPreviewModalProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrintClick = useCallback(async () => {
    try {
      // Method 1: Try to print directly from iframe (most reliable)
      if (iframeRef.current?.contentWindow && iframeRef.current?.contentDocument) {
        const iframeWindow = iframeRef.current.contentWindow;
        const iframeDoc = iframeRef.current.contentDocument;
        
        // Ensure content is loaded
        if (iframeDoc.readyState === 'complete') {
          iframeWindow.focus();
          iframeWindow.print();
          return;
        }
      }

      // Method 2: Use modern browser print API if available
      if ('print' in window && typeof window.print === 'function') {
        // Create a temporary container for print content
        const originalContent = document.body.innerHTML;
        const printContainer = document.createElement('div');
        printContainer.innerHTML = htmlContent;
        
        // Hide original content and show print content
        document.body.style.visibility = 'hidden';
        document.body.appendChild(printContainer);
        printContainer.style.visibility = 'visible';
        printContainer.style.position = 'absolute';
        printContainer.style.top = '0';
        printContainer.style.left = '0';
        printContainer.style.width = '100%';
        printContainer.style.zIndex = '9999';
        printContainer.style.backgroundColor = 'white';
        
        // Add print-specific styles
        const printStyles = document.createElement('style');
        printStyles.textContent = `
          @media print {
            body { margin: 0 !important; padding: 0 !important; }
            * { visibility: hidden !important; }
            .print-container, .print-container * { visibility: visible !important; }
            .print-container { position: static !important; }
          }
          @media screen {
            .print-container { display: block !important; }
          }
        `;
        printContainer.className = 'print-container';
        document.head.appendChild(printStyles);
        
        // Trigger print
        window.print();
        
        // Restore original content after print dialog closes
        setTimeout(() => {
          document.body.innerHTML = originalContent;
          document.body.style.visibility = 'visible';
          if (document.head.contains(printStyles)) {
            document.head.removeChild(printStyles);
          }
        }, 100);
        
        return;
      }

      // Method 3: Fallback notification
      alert('Please use your browser\'s print function (Ctrl+P or Cmd+P) to print the invoice preview.');
      
    } catch (error) {
      console.error('Print failed:', error);
      alert('Printing failed. Please use your browser\'s print function (Ctrl+P or Cmd+P) to print the invoice preview.');
    }
  }, [htmlContent]);

  useEffect(() => {
    if (isOpen) {
      setIframeKey(prev => prev + 1);
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Add Ctrl+P or Cmd+P shortcut for printing
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrintClick();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, handlePrintClick]);

  useEffect(() => {
    if (isOpen && iframeRef.current && htmlContent) {
      const iframe = iframeRef.current;
      
      const loadContent = () => {
        try {
          // Method 1: Try direct document write
          if (iframe.contentWindow && iframe.contentDocument) {
            const doc = iframe.contentDocument;
            doc.open();
            doc.write(htmlContent);
            doc.close();
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Method 1 failed, trying alternative:', error);
        }

        try {
          // Method 2: Use data URL as fallback
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
          iframe.src = dataUrl;
          setIsLoading(false);
        } catch (error) {
          console.warn('Method 2 failed:', error);
          setIsLoading(false);
        }
      };

      // Use onload event for better reliability
      const handleIframeLoad = () => {
        if (iframe.src.startsWith('data:')) {
          setIsLoading(false);
          return;
        }
        loadContent();
      };

      iframe.addEventListener('load', handleIframeLoad);
      
      // Try to load immediately
      const timer = setTimeout(loadContent, 100);

      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
        clearTimeout(timer);
      };
    }
  }, [isOpen, htmlContent, iframeKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrintClick}
              className="bg-gray-900 hover:bg-gray-800 text-white"
              title="Print Invoice (Ctrl+P)"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-white relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <span>Loading preview...</span>
                </div>
              </div>
            )}
            <iframe
              key={iframeKey}
              ref={iframeRef}
              className="w-full h-full"
              style={{ 
                border: 'none',
                backgroundColor: 'white'
              }}
              title="Print Preview"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrintClick}
            className="bg-gray-900 hover:bg-gray-800 text-white"
            title="Print Invoice (Ctrl+P)"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}