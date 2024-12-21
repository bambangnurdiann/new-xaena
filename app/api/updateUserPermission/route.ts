// /api/updateUserPermission
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';


export async function POST(request: { json: () => PromiseLike<{ username: any; canUploadTickets: any; }> | { username: any; canUploadTickets: any; }; }) {
    try {
      const { username, canUploadTickets } = await request.json();
  
      if (typeof canUploadTickets !== 'boolean' || !username) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);
      const usersCollection = db.collection('login_user');
  
      const result = await usersCollection.updateOne(
        { username },
        { $set: { canUploadTickets } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'User permission updated successfully' });
    } catch (error) {
      console.error('Error updating user permission:', error);
      return NextResponse.json({ error: 'Failed to update user permission' }, { status: 500 });
    }
  }