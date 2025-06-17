"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import BuyNowButton from "../BuyNowButton";

// 定义我们自己的用户接口，只包含需要的属性
interface SerializedUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddress: string;
  emailVerified: boolean;
}

interface ServerTrialData {
  trialStartTime: number;
  trialEndTime: number;
  isTrialActive: boolean;
}

interface DashboardContentProps {
  user: SerializedUser;
  serverTrialData?: ServerTrialData | null;
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

export default function DashboardContent({ user, serverTrialData }: DashboardContentProps) {
  const [message, setMessage] = useState<string>("");
  const [isExtensionConnected, setIsExtensionConnected] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [allowTabClose, setAllowTabClose] = useState<boolean>(false);
  const [activationCode, setActivationCode] = useState<string>("");
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [trialStartTime, setTrialStartTime] = useState<number | null>(serverTrialData?.trialStartTime || null);
  const [trialTimeRemaining, setTrialTimeRemaining] = useState<number | null>(
    serverTrialData?.isTrialActive ? serverTrialData.trialEndTime - Date.now() : null
  );
  const [isTrialActive, setIsTrialActive] = useState<boolean>(serverTrialData?.isTrialActive || false);
  const authSentRef = useRef<boolean>(false);
  const { getToken } = useAuth();
  const [trialStatusChecked, setTrialStatusChecked] = useState<boolean>(!!serverTrialData);

  // 首先检查是否在客户端
  useEffect(() => {
    setIsClient(true);

    // 如果有服务器提供的试用数据，立即更新状态
    if (serverTrialData) {
      setTrialStartTime(serverTrialData.trialStartTime);
      setIsTrialActive(serverTrialData.isTrialActive);

      if (serverTrialData.isTrialActive) {
        const currentTime = Date.now();
        setTrialTimeRemaining(Math.max(0, serverTrialData.trialEndTime - currentTime));
      } else {
        setTrialTimeRemaining(0);
      }

      setTrialStatusChecked(true);
    }
  }, [serverTrialData]);

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

  // 获取Token的函数，包含重试逻辑
  const getClerkToken = async (maxRetries = 3, delay = 1000) => {
    setIsLoadingToken(true);
    let token = null;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        token = await getToken();
        if (token) {
          console.log("成功获取Clerk token");
          setIsLoadingToken(false);
          return token;
        }
        console.log(`未获取到token，尝试重试（${retries + 1}/${maxRetries}）`);
        retries++;
        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error("获取token时发生错误:", error);
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsLoadingToken(false);
    return null;
  };

  // 监听扩展发送的试用状态更新消息
  useEffect(() => {
    if (!isClient || !isExtensionConnected) return;

    // 创建消息监听器
    const handleExtensionMessages = (event: MessageEvent) => {
      // 检查是否是我们的消息
      if (event.data && event.data.action === "trial-status-updated") {
        console.log("收到试用状态更新:", event.data);

        const currentTime = Date.now();
        const trialEndTime = event.data.trialEndTime;

        if (currentTime < trialEndTime) {
          setIsTrialActive(true);
          setTrialStartTime(event.data.trialStartTime);
          setTrialTimeRemaining(trialEndTime - currentTime);
          console.log("试用状态已更新: 活跃", formatRemainingTime(trialEndTime - currentTime));
        } else {
          setIsTrialActive(false);
          setTrialTimeRemaining(0);
          console.log("试用状态已更新: 已过期");
        }
      }
    };

    // 添加消息监听器
    window.addEventListener("message", handleExtensionMessages);

    // 主动请求当前试用状态
    const extensionId = localStorage.getItem('extensionId');
    if (extensionId && window.chrome?.runtime?.sendMessage) {
      window.chrome.runtime.sendMessage(extensionId, { action: "get-trial-status" });
    }

    // 清理函数
    return () => {
      window.removeEventListener("message", handleExtensionMessages);
    };
  }, [isClient, isExtensionConnected]);

  // 获取当前用户状态的函数
  useEffect(() => {
    if (!isClient || !isExtensionConnected || serverTrialData) return;

    const getUserStatus = async () => {
      try {
        const extensionId = localStorage.getItem('extensionId');
        if (!extensionId) return;

        if (window.chrome?.runtime?.sendMessage) {
          window.chrome.runtime.sendMessage(extensionId, {
            action: "get-user-status"
          }, (response) => {
            if (response) {
              console.log("获取到用户状态:", response);
              setIsPro(response.isPro || false);

              // 处理试用状态
              if (response.isTrialActive && response.trialStartTime) {
                setTrialStartTime(response.trialStartTime);
                const currentTime = Date.now();
                const trialEndTime = response.trialEndTime || (response.trialStartTime + (60 * 60 * 1000)); // 1小时(毫秒)

                if (currentTime < trialEndTime) {
                  setIsTrialActive(true);
                  setTrialTimeRemaining(trialEndTime - currentTime);
                  console.log("设置试用状态: 活跃", formatRemainingTime(trialEndTime - currentTime));
                } else {
                  setIsTrialActive(false);
                  setTrialTimeRemaining(0);
                  console.log("设置试用状态: 已过期");
                }
              } else {
                // 如果没有明确的试用状态，则标记为已检查但未激活
                setIsTrialActive(false);
                setTrialTimeRemaining(null);
                console.log("未找到活跃的试用");
              }

              // 标记已检查试用状态
              setTrialStatusChecked(true);
            }
          });
        }
      } catch (error) {
        console.error("获取用户状态时出错:", error);
        // 即使出错，也标记为已检查
        setTrialStatusChecked(true);
      }
    };

    getUserStatus();

    // 每分钟刷新一次用户状态，确保状态保持最新
    const intervalId = setInterval(getUserStatus, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isClient, isExtensionConnected, serverTrialData]);

  // 计时器更新试用剩余时间
  useEffect(() => {
    if (!isTrialActive || trialTimeRemaining === null) return;

    const timer = setInterval(() => {
      setTrialTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          setIsTrialActive(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTrialActive, trialTimeRemaining]);

  // 格式化剩余时间为分:秒格式
  const formatRemainingTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
        // 显示正在获取令牌的状态
        setMessage("正在获取认证令牌...");

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

        // 获取Clerk token (使用带重试的函数)
        const token = await getClerkToken();

        if (!token) {
          setMessage("无法获取认证令牌，请点击下方按钮重试");
          console.error("获取Clerk token失败，已达到最大重试次数");
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

  // 手动重试获取token并发送认证数据
  const handleRetryAuth = async () => {
    authSentRef.current = false; // 重置标志，允许重新发送认证数据

    // 重新挂载认证逻辑
    setMessage("正在重新尝试获取认证令牌...");

    // 从URL和localStorage获取extension_id
    const urlParams = new URLSearchParams(window.location.search);
    const extensionIdFromUrl = urlParams.get('extension_id');
    const extensionIdFromStorage = localStorage.getItem('extensionId');
    const extensionId = extensionIdFromUrl || extensionIdFromStorage;

    // 获取token并发送认证数据
    try {
      const token = await getClerkToken(3, 1000);

      if (!token) {
        setMessage("重试后仍无法获取认证令牌，请尝试刷新页面");
        return;
      }

      // 准备认证数据
      const authData = {
        action: "clerk-auth-success",
        type: "clerk-auth-success",
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

      // 使用chrome.runtime.sendMessage发送 (如果扩展ID可用)
      if (typeof window !== "undefined" && extensionId && window.chrome?.runtime?.sendMessage) {
        window.chrome.runtime.sendMessage(extensionId, authData);
      }

      // 使用window.postMessage广播
      window.postMessage({
        ...authData,
        extensionId: extensionId
      }, "*");

      // 更新localStorage
      localStorage.setItem('auth_token_for_extension', token);

      setMessage("认证数据已重新发送，请等待扩展响应...");
    } catch (error) {
      console.error("重试获取token时出错:", error);
      setMessage("重试过程中发生错误，请刷新页面");
    }
  };

  const handleActivationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCode.trim()) {
      alert('请输入有效的激活码');
      return;
    }

    const extensionId = localStorage.getItem('extensionId');

    if (!extensionId || !window.chrome?.runtime?.sendMessage) {
      alert('无法与扩展建立连接，请确保扩展已安装并刷新页面');
      return;
    }

    window.chrome.runtime.sendMessage(extensionId, {
      action: "activate-license",
      licenseKey: activationCode.trim(),
      userId: user.id,
      email: user.emailAddress
    }, (response) => {
      if (response && response.success) {
        alert('激活成功！您现在已经是Pro用户。');
        setIsPro(true);
        setActivationCode('');
      } else {
        alert(`激活失败: ${response?.message || '无效的激活码'}`);
      }
    });
  };

  const handleStartTrial = () => {
    const extensionId = localStorage.getItem('extensionId');

    if (!extensionId || !window.chrome?.runtime?.sendMessage) {
      alert('无法与扩展建立连接，请确保扩展已安装并刷新页面');
      return;
    }

    window.chrome.runtime.sendMessage(extensionId, {
      action: "start-trial",
      userId: user.id,
      email: user.emailAddress
    }, (response) => {
      if (response && response.success) {
        setIsTrialActive(true);
        setTrialStartTime(response.trialStartTime);
        setTrialTimeRemaining(60 * 60 * 1000); // 1小时(毫秒)
        alert('试用已重新开始！您现在可以免费体验1小时Pro功能。');

        // 试用开始后刷新页面，以便从服务器获取最新的试用数据
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        alert(`重新开始试用失败: ${response?.message || '未知错误'}`);
      }
    });
  };

  const handleBuyLicense = () => {
    // 此功能现在由BuyNowButton组件处理
    console.log("使用BuyNowButton组件重定向到Stripe结账页面");
  };

  // Safety check for if the user object is somehow null
  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${isExtensionConnected ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
          {message}
          {message.includes("无法获取认证令牌") && (
            <button
              onClick={handleRetryAuth}
              className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              disabled={isLoadingToken}
            >
              {isLoadingToken ? '正在获取...' : '重新获取令牌'}
            </button>
          )}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.firstName || 'User'}</h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Extension Status</h3>
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isExtensionConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span>{isExtensionConnected ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>

        {!isExtensionConnected && (
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium text-blue-700 mb-2">Connect Your Extension</h3>
            <p className="text-blue-600 mb-4">To connect your Day Progress Bar extension, please follow these steps:</p>
            <ol className="list-decimal pl-5 text-blue-700 space-y-2">
              <li>Open the extension from your Chrome toolbar</li>
              <li>Click on the account icon in the extension</li>
              <li>Select "Connect to Account"</li>
            </ol>
          </div>
        )}

        {/* 模块1：用户类型与试用信息 */}
        {isExtensionConnected && (
          <div className="mb-8 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Account Status</h3>

            <div className="flex items-center mb-4">
              <div className={`w-4 h-4 rounded-full mr-2 ${isPro ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              <span className="font-medium">{isPro ? 'Pro User' : 'Free User'}</span>
              <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded ${isPro ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>

            {!isPro && (
              <div className="mt-3">
                {isTrialActive ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Pro Trial Active</p>
                        <p className="text-xs text-indigo-600 mt-1">Try all Pro features for 1 hour</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-indigo-700">Time Remaining:</div>
                        <div className="text-xl font-mono font-bold text-indigo-800">
                          {trialTimeRemaining !== null ? formatRemainingTime(trialTimeRemaining) : "00:00"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{
                            width: `${trialTimeRemaining !== null ? Math.max(0, Math.min(100, (trialTimeRemaining / (60 * 60 * 1000)) * 100)) : 0}%`,
                            transition: 'width 1s linear'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-indigo-700">Pro Trial</p>
                        {trialStatusChecked ? (
                          <p className="text-xs text-indigo-600 mt-1">
                            {trialStartTime ? "Your trial has expired" : "Start your free trial"}
                          </p>
                        ) : (
                          <p className="text-xs text-indigo-600 mt-1">Checking trial status...</p>
                        )}
                      </div>
                      <button
                        onClick={handleStartTrial}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {trialStartTime ? "Restart Trial" : "Start Trial"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 模块2：购买许可证 */}
        {isExtensionConnected && !isPro && (
          <div className="mb-8 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Get Pro Access</h3>

            <div className="flex items-start p-4 bg-white border border-gray-200 rounded-md shadow-sm">
              <div className="flex-grow">
                <h4 className="text-lg font-semibold text-gray-900">Lifetime Pro License</h4>
                <p className="text-gray-600 mt-1">One-time purchase, unlimited access to all Pro features</p>

                <ul className="mt-3 space-y-1">
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Unlimited custom settings
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Priority support
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Future updates included
                  </li>
                </ul>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">$6.99</div>
                <div className="text-sm text-gray-500 mb-4">One-time payment</div>

                <BuyNowButton
                  price="6.99"
                  email={user.emailAddress}
                  returnUrl={window.location.href}
                >
                  Buy Now
                </BuyNowButton>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">License key will be sent to your email address after purchase</p>
          </div>
        )}

        {/* 模块3：激活许可证 */}
        {isExtensionConnected && !isPro && (
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Activate License</h3>

            <form onSubmit={handleActivationSubmit} className="space-y-4">
              <div>
                <label htmlFor="license-key" className="block text-sm font-medium text-gray-700 mb-1">
                  License Key
                </label>
                <input
                  id="license-key"
                  type="text"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your license key"
                />
                <p className="mt-1 text-xs text-gray-500">Enter the license key you received by email after purchase</p>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Activate License
              </button>
            </form>
          </div>
        )}

        {/* User Profile Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Your Profile</h3>
          <div className="flex items-center">
            <img
              src={user.imageUrl || `https://ui-avatars.com/api/?name=${user.firstName || ''}+${user.lastName || ''}&background=random`}
              alt="Profile"
              className="w-12 h-12 rounded-full mr-4"
            />
            <div>
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.emailAddress}</p>
              <p className="text-xs text-gray-400">
                {user.emailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}