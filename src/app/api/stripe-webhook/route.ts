import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

// 初始化Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// 创建具有管理权限的Supabase客户端
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 生成许可证密钥
function generateLicenseKey() {
  // 使用nanoid生成唯一ID
  const uniqueId = nanoid(16);

  // 添加可识别的前缀
  const prefix = 'DAYBAR';

  // 格式化为易读格式，如DAYBAR-XXXX-XXXX-XXXX
  const part1 = uniqueId.substring(0, 4).toUpperCase();
  const part2 = uniqueId.substring(4, 8).toUpperCase();
  const part3 = uniqueId.substring(8, 12).toUpperCase();

  return `${prefix}-${part1}-${part2}-${part3}`;
}

// 发送许可证邮件的函数
async function sendLicenseEmail(email: string, licenseKey: string) {
  console.log(`正在发送许可证邮件到 ${email}, 许可证密钥: ${licenseKey}`);

  try {
    // 创建邮件传输对象
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 邮件内容
    const mailOptions = {
      from: `"Day Progress Bar" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '您的 Day Progress Bar 许可证密钥',
      text: `感谢您购买 Day Progress Bar！\n\n您的许可证密钥是: ${licenseKey}\n\n请将此密钥保存在安全的地方，您需要它来激活应用程序。\n\n如有任何问题，请随时联系我们的支持团队。\n\n祝您使用愉快！`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">感谢您购买 Day Progress Bar！</h2>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p style="font-size: 16px; margin-bottom: 10px;">您的许可证密钥是:</p>
            <p style="font-size: 20px; font-weight: bold; color: #2563eb; letter-spacing: 1px; padding: 10px; background-color: #e5edff; border-radius: 4px;">${licenseKey}</p>
          </div>

          <p>请将此密钥保存在安全的地方，您需要它来激活应用程序。</p>

          <p>如何使用您的许可证密钥:</p>
          <ol>
            <li>打开 Day Progress Bar 应用程序</li>
            <li>点击"激活许可证"</li>
            <li>输入上面的许可证密钥</li>
            <li>点击"激活"</li>
          </ol>

          <p>如有任何问题，请随时联系我们的支持团队。</p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666;">
            <p>祝您使用愉快！</p>
            <p style="font-size: 12px; color: #999;">此邮件由系统自动发送，请勿回复。</p>
          </div>
        </div>
      `
    };

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('发送邮件时出错:', error);
    return false;
  }
}

// 根据邮箱获取用户ID
async function getUserIdByEmail(email: string) {
  // 从users表中查找对应的用户ID
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error("查找用户时出错:", error || "未找到用户");
    return null;
  }

  return data.id;
}

/**
 * 处理Stripe webhook请求
 */
export async function POST(request: NextRequest) {
  console.log("接收到Stripe webhook请求");

  try {
    // 1. 获取请求数据和签名
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error("缺少Stripe签名");
      return NextResponse.json(
        { success: false, error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // 2. 验证webhook签名
    let event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("未配置STRIPE_WEBHOOK_SECRET");
      return NextResponse.json(
        { success: false, error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { success: false, error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // 3. 处理不同类型的Stripe事件
    console.log(`处理Stripe事件: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // 确保付款已成功
        if (session.payment_status === 'paid') {
          // 获取客户信息
          const customerEmail = session.customer_details?.email;

          if (!customerEmail) {
            console.error("未找到客户邮箱");
            return NextResponse.json(
              { success: false, error: "Customer email not found" },
              { status: 400 }
            );
          }

          // 获取用户ID
          const userId = await getUserIdByEmail(customerEmail);

          if (!userId) {
            console.error(`未找到与邮箱 ${customerEmail} 关联的用户`);
            return NextResponse.json(
              { success: false, error: "User not found" },
              { status: 404 }
            );
          }

          // 生成新的许可证密钥
          const licenseKey = generateLicenseKey();

          // 保存到数据库
          const { data, error } = await supabaseAdmin
            .from('licenses')
            .insert({
              user_id: userId,
              license_key: licenseKey,
              active: true,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后过期
              updated_at: new Date().toISOString(),
              email: customerEmail // 存储客户邮箱以便后续验证
            })
            .select();

          if (error) {
            console.error("保存许可证到数据库时出错:", error);
            return NextResponse.json(
              { success: false, error: "Failed to save license" },
              { status: 500 }
            );
          }

          // 发送包含许可证密钥的电子邮件
          await sendLicenseEmail(customerEmail, licenseKey);

          console.log(`许可证密钥已生成并发送到 ${customerEmail}`);

          // 获取前端成功页面URL，并附加许可证密钥
          const successUrl = new URL('/payment-success', request.nextUrl.origin);
          successUrl.searchParams.set('email', customerEmail);
          successUrl.searchParams.set('licenseKey', licenseKey);

          // 这将用于重定向用户
          console.log(`成功URL: ${successUrl.toString()}`);
        }
        break;
      }

      case 'invoice.paid': {
        // 处理续费付款
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // 从Stripe获取客户信息
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const customerEmail = customer.email;

        if (!customerEmail) {
          console.error("未找到客户邮箱");
          return NextResponse.json(
            { success: false, error: "Customer email not found" },
            { status: 400 }
          );
        }

        // 获取用户ID
        const userId = await getUserIdByEmail(customerEmail);

        if (!userId) {
          console.error(`未找到与邮箱 ${customerEmail} 关联的用户`);
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }

        // 查找这个用户的许可证
        const { data: licenses, error } = await supabaseAdmin
          .from('licenses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error || !licenses || licenses.length === 0) {
          console.error("查找客户许可证时出错:", error || "未找到许可证");
          return NextResponse.json(
            { success: false, error: "License not found" },
            { status: 404 }
          );
        }

        const license = licenses[0];

        // 更新许可证有效期延长一年
        const newExpirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabaseAdmin
          .from('licenses')
          .update({
            active: true,
            expires_at: newExpirationDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', license.id);

        if (updateError) {
          console.error("更新许可证时出错:", updateError);
          return NextResponse.json(
            { success: false, error: "Failed to update license" },
            { status: 500 }
          );
        }

        // 发送续订确认邮件
        await sendLicenseEmail(customerEmail, license.license_key);

        console.log(`许可证已续订，有效期至 ${newExpirationDate}`);
        break;
      }

      default:
        console.log(`未处理的Stripe事件类型: ${event.type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error(`处理Stripe webhook时出错:`, error);
    return NextResponse.json(
      { success: false, error: `Webhook processing error: ${error.message}` },
      { status: 500 }
    );
  }
}