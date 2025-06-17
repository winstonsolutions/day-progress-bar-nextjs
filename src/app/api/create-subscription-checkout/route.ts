import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

/**
 * API route to create a subscription checkout session with Stripe
 */
export async function POST(request: NextRequest) {
  try {
    // 获取Stripe密钥
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);

    // 在生产环境中，我们会验证会话
    const session = await auth();

    // 解析请求体
    const body = await request.json();
    const { priceInUSD, email, returnUrl } = body;

    if (!priceInUSD) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 });
    }

    // 构建成功和取消URL
    const successUrl = new URL('/payment-success', request.nextUrl.origin).toString();
    const cancelUrl = returnUrl || new URL('/payment?canceled=true', request.nextUrl.origin).toString();

    // 创建Stripe订阅结账会话
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Day Progress Bar Premium',
              description: 'Monthly subscription to Day Progress Bar Premium features',
              images: ['https://i.imgur.com/EHyR2nP.png'], // 替换为您的产品图片
            },
            unit_amount: Math.round(parseFloat(priceInUSD) * 100), // 转换为美分
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
    });

    // 返回结账会话URL
    return NextResponse.json({
      url: checkoutSession.url,
      success: true
    });
  } catch (error) {
    console.error('Error creating subscription checkout session:', error);
    return NextResponse.json({
      error: 'Failed to create checkout session'
    }, { status: 500 });
  }
}