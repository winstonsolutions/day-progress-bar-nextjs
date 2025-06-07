import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const extensionId = searchParams.get("extensionId") || "";

  // Redirect to the dashboard with the extension ID as a query parameter
  return NextResponse.redirect(new URL(`/dashboard?extensionId=${extensionId}`, request.url));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Process authentication data
    const { token, userId, extensionId } = body;

    // Here you would typically validate the token with Clerk
    // For demonstration, we're just returning success

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      redirectUrl: `/dashboard?extensionId=${extensionId}`
    });
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.json({
      success: false,
      message: "Authentication failed"
    }, { status: 400 });
  }
}