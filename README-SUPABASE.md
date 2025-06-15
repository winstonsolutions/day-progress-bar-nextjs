# Day Progress Bar - Supabase迁移指南

本文档详细说明如何将Day Progress Bar的后端从PostgreSQL直接连接迁移到Supabase平台。

## 准备工作

1. 创建Supabase账号和项目：
   - 访问 [Supabase](https://supabase.com) 并创建账号
   - 创建一个新项目
   - 记下项目URL和API密钥（公共匿名密钥和服务角色密钥）

2. 安装依赖：
   ```bash
   npm install @supabase/supabase-js
   ```

3. 创建`.env.local`文件：
   ```
   # Supabase - 客户端可访问
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Supabase - 仅服务端
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Clerk认证（现有变量）
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret_here
   ```

## 数据库设置

在Supabase SQL编辑器中执行以下SQL脚本，创建所需的表：

```sql
-- Users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User preferences table
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Licenses table
CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add row-level security policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can read their own preferences" ON public.user_preferences
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT clerk_id FROM public.users WHERE id = user_id
    )
  );

CREATE POLICY "Users can read their own licenses" ON public.licenses
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT clerk_id FROM public.users WHERE id = user_id
    )
  );
```

## 代码修改列表

已经对代码进行了以下修改：

1. **安装Supabase依赖**
   - 添加`@supabase/supabase-js`
   - 移除PostgreSQL相关依赖（`pg`、`pg-hstore`、`sequelize`）

2. **创建Supabase客户端**
   - 在`/src/lib/db.ts`中初始化Supabase客户端
   - 在`/src/lib/schema.ts`中定义TypeScript类型

3. **修改API路由**
   - `users/route.ts`使用了带类型的Supabase客户端
   - `webhook/clerk/route.ts`使用了Supabase管理员客户端来处理用户事件

## 常见问题解决

### Next.js 15与headers()函数
如果您在使用`headers()`函数时遇到类型错误，请尝试以下解决方案：

```typescript
// 在webhook handlers中
import { headers } from 'next/headers';

export async function POST(req: Request) {
  // 在Next.js 15中获取headers的正确方法
  const headersList = headers();

  // 然后使用get方法获取特定的header
  const authHeader = headersList.get('authorization');
}
```

### Clerk与Supabase集成
当使用Clerk进行身份验证和Supabase进行数据存储时：
- Clerk负责用户认证
- 用户数据需要手动同步到Supabase（通过webhook）
- 通过将clerk_id存储在用户表中关联账户

### 处理环境变量错误
如果看到"Missing Supabase environment variables"错误，请确保：
1. `.env.local`文件正确创建
2. 包含所有必需的Supabase变量
3. 应用重新启动以加载新的环境变量

## 数据迁移

如果您有现有的PostgreSQL数据，请按照以下步骤迁移：

1. 导出当前数据：
   ```bash
   pg_dump -t users -t user_preferences -t licenses --data-only --column-inserts your_db > data.sql
   ```

2. 修改SQL脚本以匹配新的表结构

3. 将修改后的SQL脚本导入Supabase：
   - 在Supabase控制台中打开SQL编辑器
   - 粘贴修改后的SQL脚本并执行

## 验证安装

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 测试用户注册和登录流程

3. 查看Supabase控制台中的数据，确认用户数据正确同步

## 其他资源

- [Supabase 文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript/start)
- [Next.js 环境变量](https://nextjs.org/docs/basic-features/environment-variables)