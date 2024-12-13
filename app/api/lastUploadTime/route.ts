export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface SystemSetting {
  _id: string; // Explicitly define _id as a string
  lastUploadTime?: Date;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const settingsCollection = db.collection<SystemSetting>('system_settings'); // Add the type here

    const settings = await settingsCollection.findOne({ _id: 'settings' });

    if (!settings || !settings.lastUploadTime) {
      return NextResponse.json({ lastUploadTime: null }, { status: 200 });
    }

    return NextResponse.json({ lastUploadTime: settings.lastUploadTime });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching last upload time:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last upload time', message: error.message },
      { status: 500 }
    );
  }
}
}

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('xaena_db');
    const settingsCollection = db.collection<SystemSetting>('system_settings'); // Add the type here

    const lastUploadTime = new Date();

    await settingsCollection.updateOne(
      { _id: 'settings' },
      { $set: { lastUploadTime } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, lastUploadTime });
  } catch (error) {
    if (error instanceof Error) {
    console.error('Error updating last upload time:', error);
    return NextResponse.json(
      { error: 'Failed to update last upload time', message: error.message },
      { status: 500 }
    );
  }
}
}
