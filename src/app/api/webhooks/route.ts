import { IncomingHttpHeaders } from "http";
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook, WebhookRequiredHeaders } from "svix";
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/schema';

// 创建具有管理权限的Supabase客户端，用于webhook处理
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Clerk webhook事件类型
type EventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.removed';

type Event = {
  data: Record<string, unknown>;
  object: 'event';
  type: EventType;
};

/**
 * 统一的webhook处理路由
 * 处理来自不同服务的webhook请求
 */
export async function POST(request: NextRequest) {
  console.log("Received webhook request at /api/webhooks");

  try {
    // 获取请求头
    const headersList = await headers();

    // 检查是否为Clerk webhook
    if (headersList.has('svix-id') && headersList.has('svix-signature')) {
      return handleClerkWebhook(request);
    }

    // 如果有Supabase特定的header，可以在这里添加处理
    // if (headersList.has('supabase-specific-header')) {
    //   return handleSupabaseWebhook(request);
    // }

    // 如果无法确定webhook类型，返回错误
    return NextResponse.json(
      { success: false, error: "Unknown webhook type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { success: false, error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

/**
 * 处理来自Clerk的webhook请求
 */
async function handleClerkWebhook(request: Request) {
  console.log("Processing Clerk webhook");

  try {
    const payload = await request.json();

    // 获取请求头
    const headersList = await headers();

    // 检查必要的headers是否存在
    const svixId = headersList.get("svix-id");
    const svixTimestamp = headersList.get("svix-timestamp");
    const svixSignature = headersList.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing svix headers");
      return NextResponse.json(
        { success: false, error: "Missing svix headers" },
        { status: 400 }
      );
    }

    // 构建headers对象，用于webhook验证
    const heads = {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    };

    // 验证webhook签名
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing CLERK_WEBHOOK_SECRET");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const wh = new Webhook(webhookSecret);
    let evt: Event | null = null;

    try {
      evt = wh.verify(
        JSON.stringify(payload),
        heads as IncomingHttpHeaders & WebhookRequiredHeaders
      ) as Event;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return NextResponse.json({ success: false, error: "Webhook verification failed" }, { status: 400 });
    }

    // 处理webhook事件
    const eventType: EventType = evt.type;
    console.log(`Processing Clerk webhook event: ${eventType}`);

    try {
      switch (eventType) {
        case 'user.created': {
          // 新用户注册 - 创建Supabase用户记录
          const { id, email_addresses, first_name, last_name } = evt.data as any;

          if (!id || !email_addresses || !email_addresses[0]?.email_address) {
            console.error("Missing required user data from Clerk webhook");
            return NextResponse.json({ success: false, error: "Invalid user data" }, { status: 400 });
          }

          const currentTime = new Date().toISOString();

          const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
              clerk_id: id,
              email: email_addresses[0].email_address,
              first_name: first_name || null,
              last_name: last_name || null,
              created_at: currentTime,
              updated_at: currentTime,
              trial_started_at: currentTime // 在注册时设置试用开始时间
            })
            .select();

          if (error) {
            console.error("Error creating user in Supabase:", error);
          } else {
            console.log("User created in Supabase:", data);
          }
          break;
        }

        case 'user.updated': {
          // 用户资料更新 - 更新Supabase用户记录
          const { id, email_addresses, first_name, last_name } = evt.data as any;

          if (!id) {
            console.error("Missing user ID from Clerk webhook");
            return NextResponse.json({ success: false, error: "Invalid user data" }, { status: 400 });
          }

          const updateData: any = {
            updated_at: new Date().toISOString()
          };

          if (email_addresses && email_addresses[0]?.email_address) {
            updateData.email = email_addresses[0].email_address;
          }

          if (first_name !== undefined) updateData.first_name = first_name;
          if (last_name !== undefined) updateData.last_name = last_name;

          const { error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('clerk_id', id);

          if (error) {
            console.error("Error updating user in Supabase:", error);
          } else {
            console.log("User updated in Supabase for clerk_id:", id);
          }
          break;
        }

        case 'user.deleted': {
          // 用户删除 - 删除Supabase用户记录
          const { id } = evt.data as any;

          if (!id) {
            console.error("Missing user ID from Clerk webhook");
            return NextResponse.json({ success: false, error: "Invalid user data" }, { status: 400 });
          }

          const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('clerk_id', id);

          if (error) {
            console.error("Error deleting user from Supabase:", error);
          } else {
            console.log("User deleted from Supabase for clerk_id:", id);
          }
          break;
        }

        case 'session.created':
          // 用户登录 - 可以在Supabase中记录会话信息
          console.log("User logged in:", evt.data);
          break;

        case 'session.removed':
          // 用户登出 - 可以在Supabase中更新会话状态
          console.log("User logged out:", evt.data);
          break;

        default:
          console.log("Unhandled webhook event:", eventType);
      }
    } catch (error) {
      console.error("Error processing Clerk webhook event:", error);
      return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}