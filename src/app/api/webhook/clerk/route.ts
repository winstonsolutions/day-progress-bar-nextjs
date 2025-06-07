import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

// This is the webhook handler for Clerk events
// This will be triggered when user events happen in Clerk (signin, signup, etc.)

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

export async function POST(request: Request) {
  const payload = await request.json();
  const headersList = headers();
  const heads = {
    "svix-id": headersList.get("svix-id"),
    "svix-timestamp": headersList.get("svix-timestamp"),
    "svix-signature": headersList.get("svix-signature"),
  };

  // Validate the webhook signature
  // This helps ensure the webhook is actually coming from Clerk
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
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

  // Handle the webhook based on the event type
  const eventType: EventType = evt.type;

  switch (eventType) {
    case 'user.created':
      // A new user has signed up
      // You could create a record in your database here
      console.log("New user created:", evt.data);
      break;

    case 'user.updated':
      // User data was updated
      console.log("User updated:", evt.data);
      break;

    case 'user.deleted':
      // User was deleted
      // You might want to clean up user data here
      console.log("User deleted:", evt.data);
      break;

    case 'session.created':
      // User logged in
      console.log("User logged in:", evt.data);
      break;

    case 'session.removed':
      // User logged out
      console.log("User logged out:", evt.data);
      break;

    default:
      console.log("Unhandled webhook event:", eventType);
  }

  return NextResponse.json({ success: true, event: eventType });
}