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

interface ServerTrialData {
  trialStartTime: number;
  trialEndTime: number;
  isTrialActive: boolean;
}

interface DashboardContentProps {
  user: SerializedUser;
  serverTrialData?: ServerTrialData | null;
  isPro?: boolean;
}

export default function DashboardContent({ user, serverTrialData, isPro: initialIsPro = false }: DashboardContentProps) {
  const [activationCode, setActivationCode] = useState<string>("");
  const [isPro, setIsPro] = useState<boolean>(initialIsPro);
  const [trialStartTime, setTrialStartTime] = useState<number | null>(serverTrialData?.trialStartTime || null);
  const [trialTimeRemaining, setTrialTimeRemaining] = useState<number | null>(
    serverTrialData?.isTrialActive ? serverTrialData.trialEndTime - Date.now() : null
  );
  const [isTrialActive, setIsTrialActive] = useState<boolean>(serverTrialData?.isTrialActive || false);
  const [trialStatusChecked, setTrialStatusChecked] = useState<boolean>(!!serverTrialData);
  const [isClient, setIsClient] = useState(false);

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

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCode.trim()) {
      alert('请输入有效的激活码');
      return;
    }

    try {
      // 直接调用API端点激活许可证
      const response = await fetch('/api/activate-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: activationCode.trim(),
          email: user.emailAddress
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('激活许可证失败:', data.error);
        alert(`激活失败: ${data.error || '无效的激活码'}`);
        return;
      }

      alert('激活成功！您现在已经是Pro用户。');
      setIsPro(true);
      setActivationCode('');

      // 刷新页面以更新状态
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('激活许可证时出错:', error);
      alert(`激活过程中出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleStartTrial = async () => {
    try {
      // 直接调用API端点开始试用
      const response = await fetch('/api/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.emailAddress
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('开始试用失败:', data.error);
        alert(`重新开始试用失败: ${data.error || '未知错误'}`);
        return;
      }

      setIsTrialActive(true);
      setTrialStartTime(data.trialStartTime);
      setTrialTimeRemaining(60 * 60 * 1000); // 1小时(毫秒)
      alert('试用已重新开始！您现在可以免费体验1小时Pro功能。');

      // 试用开始后刷新页面，以便从服务器获取最新的试用数据
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('开始试用时出错:', error);
      alert(`开始试用过程中出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleBuyLicense = async () => {
    try {
      console.log('创建结账会话...');

      // 直接调用我们的API端点而不是通过扩展
      const response = await fetch('/api/create-one-time-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceInUSD: 6.99,
          email: user.emailAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('创建结账会话失败:', data.error);
        alert(`创建结账会话失败: ${data.error || '未知错误'}`);
        return;
      }

      if (data.url) {
        // 重定向到Stripe结账页面
        window.location.href = data.url;
      } else {
        console.error('无效的响应:', data);
        alert('创建结账会话失败，请稍后再试');
      }
    } catch (error) {
      console.error('发送请求时出错:', error);
      alert(`创建结账会话时出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Safety check for if the user object is somehow null
  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome, {user.firstName || 'User'}</h2>

        {/* 模块1：用户类型与试用信息 */}
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

        {/* 模块2：购买许可证 */}
        {!isPro && (
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

                <button
                  onClick={handleBuyLicense}
                  className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Buy Now
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">License key will be sent to your email address after purchase</p>
          </div>
        )}

        {/* 模块3：激活许可证 */}
        {!isPro && (
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

        {/* Pro User Features Section */}
        {isPro && (
          <div className="mb-8 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Pro Features</h3>

            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-green-800">Pro License Active</span>
              </div>
              <p className="text-sm text-green-700 mt-2">
                Thank you for supporting our product! You have unlimited access to all Pro features.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-800">Custom Themes</h4>
                <p className="text-sm text-gray-600 mt-1">Personalize your progress bar with custom colors and styles</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-800">Advanced Settings</h4>
                <p className="text-sm text-gray-600 mt-1">Configure advanced options for your progress bar</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <h4 className="font-medium text-gray-800">Priority Support</h4>
                <p className="text-sm text-gray-600 mt-1">Get faster responses to your support requests</p>
              </div>
            </div>
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