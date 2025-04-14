import { NextResponse } from 'next/server';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
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
  // Parse the URL to extract parameters
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { email, chatHistory, analysisResults, dataFileLink } = body;

    // First check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId));

    if (existingUser.length > 0) {
      // Update existing user
      await db.update(users)
        .set({
          email: email || existingUser[0].email,
          chatHistory: chatHistory || existingUser[0].chatHistory,
          analysisResults: analysisResults || existingUser[0].analysisResults,
          dataFileLink: dataFileLink || existingUser[0].dataFileLink,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user
      await db.insert(users).values({
        id: userId,
        email,
        chatHistory: chatHistory || [],
        analysisResults: analysisResults || [],
        dataFileLink: dataFileLink || null,
      });
    }

    const updatedUser = await db.select().from(users).where(eq(users.id, userId));
    return NextResponse.json(updatedUser[0]);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
  }
} 