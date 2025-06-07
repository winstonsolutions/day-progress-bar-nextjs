"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

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
  const { getToken } = useAuth();

  useEffect(() => {
    // Send auth data to the extension
    const sendAuthToExtension = async () => {
      try {
        // 从localStorage中获取extension_id
        const extensionId = localStorage.getItem('extensionId');
        console.log('Retrieved extension ID from localStorage:', extensionId);

        // 获取Clerk token
        const token = await getToken();

        if (!token) {
          setMessage("无法获取认证令牌");
          return;
        }

        // Prepare auth data with token
        const authData = {
          action: "clerk-auth-success",
          token: token,
          user: {
            id: user.id,
            email: user.emailAddress || "",
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          }
        };

        console.log("准备发送认证数据到扩展:", { ...authData, token: token ? token.substring(0, 10) + '...' : null });

        // Check if extension is available
        if (typeof window !== "undefined" && extensionId && window.chrome?.runtime?.sendMessage) {
          // 直接发送消息到扩展
          window.chrome.runtime.sendMessage(extensionId, authData, (response: any) => {
            if (response && response.success) {
              setMessage("成功连接到扩展并发送认证数据!");
              setIsExtensionConnected(true);
              console.log("扩展响应:", response);
            } else {
              console.error("扩展响应错误:", response);
              setMessage("扩展响应错误");
            }
          });
        } else {
          // 使用postMessage广播
          window.postMessage({
            source: "day-progress-bar-website",
            type: "clerk-auth-success",
            token: token,
            user: {
              id: user.id,
              email: user.emailAddress || "",
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl
            }
          }, "*");

          setMessage(`认证数据已广播 ${extensionId ? '(无法直接连接扩展)' : '(没有找到扩展ID)'}`);
        }
      } catch (error: unknown) {
        console.error("发送认证数据到扩展时出错:", error);
        setMessage(`连接扩展时出错: ${error instanceof Error ? error.message : String(error)}`);
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
        setMessage("扩展成功接收到认证信息!");
      }
    };

    window.addEventListener("message", handleExtensionResponse);

    return () => {
      window.removeEventListener("message", handleExtensionResponse);
    };
  }, [user, getToken]);

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
        <h3 className="text-xl font-semibold mb-2">扩展状态</h3>
        <div className={`p-4 rounded-md ${isExtensionConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <p className="font-medium">
            {isExtensionConnected
              ? "✅ 已连接到 Day Progress Bar 扩展"
              : "⏳ 等待扩展连接..."}
          </p>
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">您的账户</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">用户 ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">邮箱已验证</p>
            <p>{user.emailVerified ? "是" : "否"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}