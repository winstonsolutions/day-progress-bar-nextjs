"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState('6.99');
  const [successRedirect, setSuccessRedirect] = useState('');
  const [isCanceled, setIsCanceled] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);

  useEffect(() => {
    // Get parameters from URL
    const emailParam = searchParams.get('email');
    const priceParam = searchParams.get('price');
    const redirectParam = searchParams.get('redirect');
    const typeParam = searchParams.get('type');
    const canceledParam = searchParams.get('canceled');

    if (emailParam) setEmail(emailParam);
    if (priceParam) setPrice(priceParam);
    if (redirectParam) setSuccessRedirect(redirectParam);
    if (typeParam === 'subscription') setIsSubscription(true);
    if (canceledParam === 'true') setIsCanceled(true);
  }, [searchParams]);

  const handleBuyNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 调用适当的API端点创建Stripe结账会话
      const endpoint = isSubscription
        ? '/api/create-subscription-checkout'
        : '/api/create-one-time-checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceInUSD: price,
          email: email,
          returnUrl: successRedirect || window.location.href,
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
      console.error('Payment error:', error);
      setIsLoading(false);
      alert('Payment processing failed. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-400 to-blue-500 px-6 py-4">
          <h1 className="text-white text-2xl font-bold">Complete Your Purchase</h1>
        </div>

        {isCanceled && (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <p className="text-yellow-700">Your payment was canceled. You have not been charged.</p>
          </div>
        )}

        <div className="p-6">
          <div className="mb-8 border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
            <div className="flex justify-between items-center">
              <span>{isSubscription ? 'Day Progress Bar Premium Subscription' : 'Day Progress Bar Pro License'}</span>
              <span className="font-bold">${price}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {isSubscription
                ? 'Monthly subscription to Premium features'
                : 'Lifetime access to all Pro features'}
            </div>
          </div>

          <form onSubmit={handleBuyNow}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Your license key will be sent to this email address
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium
                ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'}`}
            >
              {isLoading ? 'Processing...' : `Buy Now - $${price} USD`}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>You will be redirected to our secure payment processor.</p>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 hover:underline mt-2 inline-block"
            >
              Cancel and return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}