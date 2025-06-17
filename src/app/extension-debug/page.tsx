"use client";

import { useState, useEffect } from 'react';
import { useAuth } from "@clerk/nextjs";

// Extend Window interface to include Chrome browser API type
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
        lastError?: {
          message: string;
        };
      };
    };
  }
}

export default function ExtensionDebugPage() {
  const [extensionId, setExtensionId] = useState<string>('');
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string>('');
  const { userId } = useAuth();

  // Load extension ID from localStorage on component mount
  useEffect(() => {
    const storedExtensionId = localStorage.getItem('extensionId');
    if (storedExtensionId) {
      setExtensionId(storedExtensionId);
    }
  }, []);

  // Save extension ID to localStorage when it changes
  const handleExtensionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    setExtensionId(newId);
    localStorage.setItem('extensionId', newId);
  };

  // Test connection to extension
  const testExtensionConnection = () => {
    if (!window.chrome?.runtime?.sendMessage) {
      setIsExtensionConnected(false);
      setTestResult('Chrome API not available. Are you using Chrome browser?');
      return;
    }

    if (!extensionId) {
      setIsExtensionConnected(false);
      setTestResult('Please enter an Extension ID first');
      return;
    }

    try {
      window.chrome.runtime.sendMessage(
        extensionId,
        { action: "ping", message: "Testing connection" },
        (response) => {
          const lastError = window.chrome?.runtime?.lastError;

          if (lastError) {
            setIsExtensionConnected(false);
            setTestResult('Connection failed');
            setLastError(lastError.message || 'Unknown error');
            return;
          }

          if (response && response.success) {
            setIsExtensionConnected(true);
            setTestResult('Connection successful! Extension responded.');
          } else {
            setIsExtensionConnected(false);
            setTestResult('Extension responded but with unexpected format');
          }
        }
      );
    } catch (error) {
      setIsExtensionConnected(false);
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Test "Buy License" functionality
  const testBuyLicense = () => {
    if (!window.chrome?.runtime?.sendMessage) {
      setTestResult('Chrome API not available');
      return;
    }

    if (!extensionId) {
      setTestResult('Please enter an Extension ID first');
      return;
    }

    try {
      setTestResult('Sending buy-license request...');

      window.chrome.runtime.sendMessage(
        extensionId,
        {
          action: "buy-license",
          userId: userId || 'test-user',
          email: 'test@example.com',
          price: 6.99
        },
        (response) => {
          const lastError = window.chrome?.runtime?.lastError;

          if (lastError) {
            setTestResult('Buy license request failed');
            setLastError(lastError.message || 'Unknown error');
            return;
          }

          setTestResult(`Buy license response: ${JSON.stringify(response)}`);

          if (response && response.checkoutUrl) {
            // Don't automatically open the URL in this debug page
            setTestResult(`Buy license success! Checkout URL: ${response.checkoutUrl}`);
          } else {
            setTestResult(`Buy license request returned unexpected response: ${JSON.stringify(response)}`);
          }
        }
      );
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Manually open checkout URL
  const openCheckoutUrl = () => {
    if (!extensionId || !window.chrome?.runtime?.sendMessage) {
      setTestResult('Extension not connected');
      return;
    }

    try {
      window.chrome.runtime.sendMessage(
        extensionId,
        {
          action: "buy-license",
          userId: userId || 'test-user',
          email: 'test@example.com',
          price: 6.99
        },
        (response) => {
          if (response && response.checkoutUrl) {
            window.open(response.checkoutUrl, '_blank');
            setTestResult('Checkout URL opened in new tab');
          } else {
            setTestResult('Failed to get checkout URL');
          }
        }
      );
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Extension Debug Tools</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Extension Connection</h2>

        <div className="mb-4">
          <label htmlFor="extension-id" className="block text-sm font-medium text-gray-700 mb-1">
            Extension ID
          </label>
          <div className="flex">
            <input
              type="text"
              id="extension-id"
              value={extensionId}
              onChange={handleExtensionIdChange}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g. abcdefghijklmnopqrstuvwxyzabcdef"
            />
            <button
              onClick={testExtensionConnection}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Test Connection
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enter your Chrome extension ID to test communication
          </p>
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-md ${isExtensionConnected ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <p className="font-medium">{testResult}</p>
            {lastError && (
              <p className="text-sm mt-1">{lastError}</p>
            )}
          </div>
        )}
      </div>

      {isExtensionConnected && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Payment Testing</h2>

          <div className="flex flex-col space-y-4">
            <button
              onClick={testBuyLicense}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Test Buy License (Get URL only)
            </button>

            <button
              onClick={openCheckoutUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Open Checkout URL
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:underline mb-2"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {showDetails && (
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>1. Check Extension Permissions:</strong> Make sure your extension has proper permissions for external messaging.</p>
            <p><strong>2. Verify Extension ID:</strong> Ensure the extension ID is correct.</p>
            <p><strong>3. Check Browser Console:</strong> Open browser developer tools to see error messages.</p>
            <p><strong>4. Extension Background Page:</strong> Check if the extension's background page is running properly.</p>
            <p><strong>5. API Endpoints:</strong> Verify that API endpoints for payment processing are configured correctly.</p>
          </div>
        )}
      </div>
    </div>
  );
}