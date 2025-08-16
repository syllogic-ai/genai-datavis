import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import db from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

export async function POST(req: Request) {
  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  // If there are no svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return Response.json({ error: 'Error verifying webhook' }, { status: 400 });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with ID: ${id} and type: ${eventType}`);

  // Handle the webhook
  try {
    if (eventType === 'user.created') {
      // Create user in our database when a new user signs up
      const { id: userId, email_addresses } = evt.data;
      
      if (userId && email_addresses && email_addresses.length > 0) {
        await db.insert(users).values({
          id: userId,
          email: email_addresses[0].email_address,
          createdAt: new Date(),
        });

        console.log(`User created: ${userId}`);
      }
    }

    if (eventType === 'user.deleted') {
      // Delete user from our database when they delete their account
      const { id: userId } = evt.data;
      
      if (userId) {
        // Delete user from our database
        await db.delete(users).where(eq(users.id, userId));
        
        console.log(`User deleted: ${userId}`);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return Response.json({ error: 'Error handling webhook' }, { status: 500 });
  }
} 