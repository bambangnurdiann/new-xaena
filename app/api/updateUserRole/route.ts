import { NextResponse } from "next/server";
import clientPromise from '@/lib/mongodb';


// /api/updateUserRole
export async function POST(request: { json: () => PromiseLike<{ username: any; role: any; }> | { username: any; role: any; }; }) {
    try {
      const { username, role } = await request.json();
  
      if (!username || !role) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
      }
  
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);
      const usersCollection = db.collection('login_user');
  
      const result = await usersCollection.updateOne(
        { username },
        { $set: { role } }
      );
  
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
  
      return NextResponse.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }
}