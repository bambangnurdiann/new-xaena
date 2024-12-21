import { MongoClient } from 'mongodb';

async function testMongoDBConnection() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const client = new MongoClient(uri);
    await client.connect();
    console.log('Successfully connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB);
    console.log('Connected to database:', process.env.MONGODB_DB);

    const collections = await db.listCollections().toArray();
    console.log('Collections in the database:', collections.map(c => c.name));

    await client.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

testMongoDBConnection();