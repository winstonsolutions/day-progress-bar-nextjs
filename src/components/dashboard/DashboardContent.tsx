"use client";

import { useState, useEffect, useRef } from "react";
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
        lastError?: {
          message: string;
        };
      };
    };
    originalWindowLocation?: any;
  }
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [message, setMessage] = useState<string>("");
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [allowTabClose, setAllowTabClose] = useState<boolean>(false);
  const [activationCode, setActivationCode] = useState<string>("");
  const authSentRef = useRef<boolean>(false);
  const { getToken } = useAuth();

  // 首先检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 防止页面导航和关闭
  useEffect(() => {
    if (!isClient) return;

    // 保存原始的window.close方法
    const originalClose = window.close;

    // 记录尝试跳转行为，但不阻止
    const monitorNavigation = () => {
      console.log("检测到页面导航尝试");

      // 如果不允许关闭，使用beforeunload事件来处理
      if (!allowTabClose) {
        console.log("提示用户导航可能会影响认证流程");
      }
    };

    // 使用事件监听器监控导航尝试
    window.addEventListener('popstate', monitorNavigation);
    window.addEventListener('hashchange', monitorNavigation);

    // 重写window.close方法
    window.close = function() {
      console.log("拦截到window.close调用");
      if (!allowTabClose) {
        console.log("阻止页面关闭");
        return;
      }
      return originalClose.call(window);
    };

    return () => {
      // 清理：恢复原始方法和移除事件监听器
      window.close = originalClose;
      window.removeEventListener('popstate', monitorNavigation);
      window.removeEventListener('hashchange', monitorNavigation);
    };
  }, [isClient, allowTabClose]);

  // 添加页面关闭前的确认对话框
  useEffect(() => {
    if (!isClient) return;

    // 添加beforeunload事件监听器
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 如果用户明确允许关闭标签页，则不阻止
      if (allowTabClose) return;

      // 防止页面被关闭，特别是在认证信息尚未发送到扩展时
      e.preventDefault();
      // 设置提示消息（注意：大多数现代浏览器不会显示自定义消息，而是显示标准提示）
      e.returnValue = "认证过程可能尚未完成，确定要离开吗？";
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClient, allowTabClose]);

  // 在确认客户端后执行认证逻辑
  useEffect(() => {
    // 如果不是客户端环境，不执行任何操作
    if (!isClient) return;

    // 确保认证信息只发送一次
    if (authSentRef.current) return;
    authSentRef.current = true;

    // 发送认证数据到扩展的主函数
    const sendAuthToExtension = async () => {
      try {
        // 从URL和localStorage两个地方获取extension_id
        const urlParams = new URLSearchParams(window.location.search);
        const extensionIdFromUrl = urlParams.get('extension_id');
        const extensionIdFromStorage = localStorage.getItem('extensionId');
        const extensionId = extensionIdFromUrl || extensionIdFromStorage;

        console.log('尝试获取扩展ID:', {
          extensionIdFromUrl,
          extensionIdFromStorage,
          finalExtensionId: extensionId
        });

        // 如果找到了扩展ID，将其保存到localStorage
        if (extensionIdFromUrl && !extensionIdFromStorage) {
          localStorage.setItem('extensionId', extensionIdFromUrl);
          console.log('已将扩展ID保存到localStorage:', extensionIdFromUrl);
        }

        // 获取Clerk token
        const token = await getToken();

        if (!token) {
          setMessage("无法获取认证令牌，请刷新页面重试");
          console.error("获取Clerk token失败");
          return;
        }

        // 准备认证数据
        const authData = {
          action: "clerk-auth-success",
          type: "clerk-auth-success", // 同时提供action和type，增加兼容性
          token: token,
          user: {
            id: user.id,
            email: user.emailAddress || "",
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          },
          source: "day-progress-bar-website"
        };

        console.log("准备发送认证数据到扩展:", {
          ...authData,
          token: token ? `${token.substring(0, 10)}...` : null,
          extensionId
        });

        // 使用三种方式尝试发送消息，提高成功率

        // 方式1: 直接使用chrome.runtime.sendMessage (如果扩展ID可用)
        if (typeof window !== "undefined" && extensionId && window.chrome?.runtime?.sendMessage) {
          console.log("方式1: 尝试通过chrome.runtime.sendMessage发送");
          try {
            window.chrome.runtime.sendMessage(extensionId, authData, (response) => {
              const lastError = window.chrome?.runtime?.lastError;
              if (lastError) {
                console.warn("方式1失败:", lastError.message);
              } else if (response && response.success) {
                console.log("方式1成功:", response);
                setMessage("成功连接到扩展并发送认证数据! 您现在可以关闭此页面。");
                setIsExtensionConnected(true);
                // 不要立即允许关闭标签页，让用户手动关闭
              } else {
                console.warn("方式1返回未知响应:", response);
              }
            });
          } catch (err) {
            console.error("方式1出错:", err);
          }
        }

        // 方式2: 使用window.postMessage广播消息
        console.log("方式2: 尝试通过window.postMessage广播");
        try {
          window.postMessage({
            ...authData,
            extensionId: extensionId
          }, "*");
          console.log("方式2: 消息已广播");
        } catch (err) {
          console.error("方式2出错:", err);
        }

        // 方式3: 在localStorage中存储认证数据，供content script读取
        console.log("方式3: 尝试通过localStorage存储认证数据");
        try {
          // 避免直接存储完整token到localStorage，只存储必要信息
          localStorage.setItem('auth_data_for_extension', JSON.stringify({
            action: "clerk-auth-success",
            user: {
              id: user.id,
              email: user.emailAddress || "",
              firstName: user.firstName,
              lastName: user.lastName
            },
            // 添加时间戳，以便扩展知道这是新的认证数据
            timestamp: Date.now()
          }));
          localStorage.setItem('auth_token_for_extension', token);
          console.log("方式3: 认证数据已存储到localStorage");
        } catch (err) {
          console.error("方式3出错:", err);
        }

        // 设置状态消息
        setMessage(`认证数据已发送(${extensionId ? '找到扩展ID' : '未找到扩展ID'})。请等待扩展响应...`);

        // 5秒后如果仍未连接，提示用户重试
        setTimeout(() => {
          if (!isExtensionConnected) {
            setMessage("未收到扩展响应，可能需要重启扩展或刷新页面");
          }
        }, 5000);

      } catch (error: unknown) {
        console.error("发送认证数据到扩展时出错:", error);
        setMessage(`连接扩展时出错: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // 在组件挂载后调用发送函数
    sendAuthToExtension();

    // 设置事件监听器，接收扩展的响应
    const handleExtensionResponse = (event: MessageEvent) => {
      console.log("收到window消息:", event.data);

      if (
        event.data &&
        (event.data.source === "day-progress-bar-extension" ||
         event.data.type === "auth_received" ||
         event.data.action === "auth_received")
      ) {
        console.log("收到扩展的响应:", event.data);
        setIsExtensionConnected(true);
        setMessage("扩展成功接收到认证信息! 您现在可以手动关闭此页面。");

        // 不自动允许关闭标签页，防止扩展自动关闭页面
        // 如果扩展试图在response后立即关闭页面，浏览器会先显示确认对话框
      }
    };

    window.addEventListener("message", handleExtensionResponse);

    return () => {
      window.removeEventListener("message", handleExtensionResponse);
    };
  }, [isClient, user, getToken]);

  const handleActivationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('激活码提交:', activationCode);
    // 这里可以添加激活码验证逻辑
    alert('激活验证功能即将推出');
  };

  // Safety check for if the user object is somehow null
  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between py-4 mb-4">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-medium text-xl">Day Progress</span>
        </div>
        <button className="flex items-center bg-blue-50 text-blue-500 px-4 py-1 rounded-full text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          免费用户
        </button>
      </div>

      {/* 欢迎信息 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">欢迎使用 Day Progress</h1>
        <p className="text-gray-600">您当前正在使用免费版本，享受7天免费试用</p>
      </div>

      {/* 免费试用信息 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-1">免费试用期</h2>
            <div className="flex justify-center mb-2">
              <span className="text-4xl font-bold">7</span>
              <span className="self-end mb-1 ml-1">天剩余</span>
            </div>
            <div className="w-full bg-blue-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">试用期结束后，您需要购买Pro版本继续使用</p>
      </div>

      {/* 购买Pro版本 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start mb-4">
          <div className="w-8 h-8 bg-green-100 flex items-center justify-center rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">购买Pro版本</h3>
            <p className="text-sm text-gray-500">一次性购买，永久使用所有功能</p>
          </div>
        </div>
        <div className="mb-6">
          <div className="text-3xl font-bold">¥6.99 <span className="text-sm font-normal text-gray-500">一次性付费</span></div>
        </div>
        <button className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition">
          立即购买
        </button>
      </div>

      {/* 激活验证 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <div className="w-8 h-8 bg-purple-100 flex items-center justify-center rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">激活码验证</h3>
            <p className="text-sm text-gray-500">已有激活码？输入激活码即可升级</p>
          </div>
        </div>
        <form onSubmit={handleActivationSubmit}>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
            placeholder="输入激活码"
            value={activationCode}
            onChange={(e) => setActivationCode(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-gray-100 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            输入激活码
          </button>
        </form>
      </div>

      {/* 扩展连接状态 - 隐藏但保留功能 */}
      <div className="hidden mt-6">
        <div className={`p-4 rounded-md ${isExtensionConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <p className="font-medium">
            {isExtensionConnected
              ? "✅ 已连接到 Day Progress Bar 扩展"
              : "⏳ 等待扩展连接..."}
          </p>
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
          {isExtensionConnected && (
            <>
              <p className="mt-2 text-sm text-green-600 font-medium">
                认证已完成，您可以手动关闭此页面并返回使用扩展。
              </p>
              <button
                onClick={() => setAllowTabClose(true)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                允许关闭页面
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}