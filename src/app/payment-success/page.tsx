"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const licenseKeyParam = searchParams.get('licenseKey');

    if (emailParam) setEmail(emailParam);
    if (licenseKeyParam) setLicenseKey(licenseKeyParam);
  }, [searchParams]);

  const handleCopyToClipboard = () => {
    if (licenseKey) {
      navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-400 to-green-600 px-6 py-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-white text-3xl font-bold">Payment Successful!</h1>
          <p className="text-green-100 mt-2">Thank you for your purchase</p>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Order Details</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Product</p>
                  <p className="font-medium">Day Progress Bar Pro License</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">$6.99 USD</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Your License Key</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-lg font-bold text-blue-800 tracking-wider">
                  {licenseKey}
                </div>
                <button
                  onClick={handleCopyToClipboard}
                  className="p-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <span className="text-green-600 text-sm font-medium">Copied!</span>
                  ) : (
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                This license key has also been sent to your email address.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Activation Instructions</h2>
            <ol className="list-decimal pl-5 space-y-2 text-gray-700">
              <li>Go to the Day Progress Bar dashboard</li>
              <li>Find the "Activate License" section</li>
              <li>Enter your license key in the input field</li>
              <li>Click the "Activate License" button</li>
              <li>Enjoy all Pro features!</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
            <Link
              href="/dashboard"
              className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}