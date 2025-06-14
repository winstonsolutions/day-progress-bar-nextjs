"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [extensionId, setExtensionId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // 防止hydration错误的第一个useEffect
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 只在客户端执行的逻辑
  useEffect(() => {
    if (!isClient) return;

    // 检测URL中的extension_id参数
    const extensionIdParam = searchParams.get('extension_id');
    if (extensionIdParam) {
      console.log('Received extension_id:', extensionIdParam);
      setExtensionId(extensionIdParam);

      // 将extension_id存储在localStorage
      try {
        localStorage.setItem('extensionId', extensionIdParam);
      } catch (err) {
        console.error('无法存储extensionId到localStorage:', err);
      }
    }

    // 如果用户已登录，重定向到dashboard
    // if (isSignedIn && userId) {
    //   router.push("/dashboard");
    // }
  }, [isClient, isSignedIn, userId, router, searchParams]);

  return (
    <div className="min-h-screen" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Day Progress Bar</span>
            <span className="block text-blue-600">Track Your Day, Boost Productivity</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            The easiest way to visualize your day's progress. Stay focused, manage time effectively, and achieve more with our Chrome extension.
          </p>

          {isClient && extensionId && (
            <p className="mt-2 text-sm text-green-600">
              Connected to extension
            </p>
          )}
        </div>

        <div className="mt-20">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-gray-50 text-lg font-medium text-gray-900">Features</span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-md">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Visual Time Tracking</h3>
                  <p className="mt-5 text-base text-gray-500">
                    See your day's progress at a glance with a simple, intuitive progress bar.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-md">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Customizable Settings</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Set your work hours, customize the appearance, and make it work for your schedule.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-md">
                <div className="-mt-6">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                    <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Productivity Boost</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Stay aware of time passing to maintain focus and improve your daily productivity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
