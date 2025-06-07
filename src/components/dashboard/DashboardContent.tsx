"use client";

import { useState, useEffect } from "react";

// 定义我们自己的用户接口，只包含需要的属性
interface SerializedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddress: string;
  emailVerified: boolean;
}

interface DashboardContentProps {
  user: SerializedUser;
}

// Chrome extension types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
      };
    };
  }
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [message, setMessage] = useState<string>("");
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);

  useEffect(() => {
    // Send auth data to the extension
    const sendAuthToExtension = () => {
      try {
        // Check if extension is available
        if (typeof window !== "undefined" && window.chrome?.runtime?.sendMessage) {
          // Prepare auth data
          const authData = {
            type: "auth_success",
            userId: user.id,
            email: user.emailAddress || "",
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          };

          // Get the extension ID from the URL query parameter if available
          const urlParams = new URLSearchParams(window.location.search);
          const extensionId = urlParams.get("extensionId");

          if (extensionId) {
            // Send message directly to the extension using its ID
            window.chrome.runtime.sendMessage(extensionId, authData, (response: any) => {
              if (response && response.success) {
                setMessage("Successfully connected to the extension!");
                setIsExtensionConnected(true);
              }
            });
          } else {
            // Broadcast to any listening extension
            window.postMessage({
              source: "day-progress-bar-website",
              ...authData
            }, "*");

            setMessage("Auth data sent to extension (broadcast)");
          }
        } else {
          setMessage("Chrome extension API not detected");
        }
      } catch (error: unknown) {
        console.error("Error sending auth data to extension:", error);
        setMessage(`Error connecting to extension: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Call the function when component mounts
    sendAuthToExtension();

    // Set up event listener for response from extension
    const handleExtensionResponse = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.source === "day-progress-bar-extension" &&
        event.data.type === "auth_received"
      ) {
        setIsExtensionConnected(true);
        setMessage("Extension successfully received authentication!");
      }
    };

    window.addEventListener("message", handleExtensionResponse);

    return () => {
      window.removeEventListener("message", handleExtensionResponse);
    };
  }, [user]);

  // Safety check for if the user object is somehow null
  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center mb-6">
        <img
          src={user.imageUrl || "/default-avatar.png"}
          alt={`${user.firstName || 'User'}'s profile`}
          className="w-16 h-16 rounded-full mr-4"
        />
        <div>
          <h2 className="text-2xl font-bold">{user.firstName || ''} {user.lastName || ''}</h2>
          <p className="text-gray-600">{user.emailAddress || ''}</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Extension Status</h3>
        <div className={`p-4 rounded-md ${isExtensionConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <p className="font-medium">
            {isExtensionConnected
              ? "✅ Connected to Day Progress Bar extension"
              : "⏳ Waiting for extension connection..."}
          </p>
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Your Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Email Verified</p>
            <p>{user.emailVerified ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}