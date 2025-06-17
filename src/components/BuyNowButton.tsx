"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BuyNowButtonProps {
  price?: string;
  email?: string;
  returnUrl?: string;
  isSubscription?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function BuyNowButton({
  price = "6.99",
  email = "",
  returnUrl = "",
  isSubscription = false,
  className = "",
  children
}: BuyNowButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // 根据类型选择端点
      const endpoint = isSubscription
        ? '/api/create-subscription-checkout'
        : '/api/create-one-time-checkout';

      // 发起API请求
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceInUSD: price,
          email: email,
          returnUrl: returnUrl || window.location.href,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // 重定向到Stripe结账页面
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsLoading(false);
      // 如果出错，重定向到支付页面
      router.push(`/payment?price=${price}${isSubscription ? '&type=subscription' : ''}${email ? `&email=${encodeURIComponent(email)}` : ''}${returnUrl ? `&redirect=${encodeURIComponent(returnUrl)}` : ''}`);
    }
  };

  const buttonClass = `px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors ${className}`;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${buttonClass} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isLoading ? "处理中..." : children || `立即购买 - $${price}`}
    </button>
  );
}