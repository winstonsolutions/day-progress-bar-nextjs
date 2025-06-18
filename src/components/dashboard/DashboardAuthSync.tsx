"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

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

export default function DashboardAuthSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run this effect on the client side and when auth is loaded
    if (!isLoaded) return;

    const syncAuthToExtension = async () => {
      try {
        // Get extension_id from URL parameters
        const extensionId = searchParams.get("extension_id");
        if (!extensionId) {
          console.log("No extension_id found in URL parameters");
          return;
        }

        // Check if we have the Chrome messaging API available
        if (!window.chrome?.runtime?.sendMessage) {
          console.error("Chrome API not available");
          setError("Chrome API not available");
          return;
        }

        // If user is signed in, get their auth token and send to extension
        if (isSignedIn && user) {
          // Get the token from Clerk
          const token = await getToken();

          // 准备用户数据
          const userInfo = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            // 添加更多你需要的字段
          };

          console.log('准备发送的用户数据:', userInfo);

          // Get user information
          const userData = {
            signedIn: true,
            token,
            user: userInfo
          };

          console.log(`Sending auth data to extension: ${extensionId}`);

          // Send auth data to extension
          window.chrome.runtime.sendMessage(
            extensionId,
            {
              action: "auth-sync",
              data: userData
            },
            (response) => {
              const lastError = window.chrome?.runtime?.lastError;

              if (lastError) {
                console.error("Failed to send auth data to extension:", lastError.message);
                setError(`Failed to sync with extension: ${lastError.message}`);
                return;
              }

              if (response && response.success) {
                console.log("Auth data sent to extension successfully!");
                setSynced(true);

                // Store sync status in sessionStorage to avoid showing the message again on page refresh
                try {
                  sessionStorage.setItem("authSynced", "true");
                } catch (e) {
                  console.error("Failed to store sync status:", e);
                }
              } else {
                console.error("Extension responded but with unexpected format", response);
                setError("Unexpected response from extension");
              }
            }
          );
        }
      } catch (err) {
        console.error("Error syncing auth to extension:", err);
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    syncAuthToExtension();
  }, [isLoaded, isSignedIn, searchParams, getToken, user]);

  // Don't render anything visible by default
  // This is just a utility component to handle extension syncing
  return null;
}