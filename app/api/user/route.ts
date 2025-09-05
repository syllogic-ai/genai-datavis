import { NextResponse } from 'next/server';
import db from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';

// GET /api/user - Get the current user's data
export async function GET(request: Request) {
  // Parse the URL to extract parameters
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const userData = await db.select().from(users).where(eq(users.id, userId));
    
    if (userData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(userData[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}

// POST /api/user - Create or update a user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email } = body;
    
    // Extract userId from body or URL params
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    const finalUserId = userId || queryUserId;

    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // First check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, finalUserId));

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          email: email || existingUser[0].email,
          createdAt: new Date(),
        })
        .where(eq(users.id, finalUserId));
    } else {
      // Create new user
      await db.insert(users).values({
        id: finalUserId,
        email,
        createdAt: new Date(),
      });
    }

    const updatedUser = await db.select().from(users).where(eq(users.id, finalUserId));
    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
  }
} 