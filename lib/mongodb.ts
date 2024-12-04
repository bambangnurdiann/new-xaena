import { MongoClient } from 'mongodb';

// Ensure that the environment variable MONGODB_URI is present
if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {}; // MongoDB connection options

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the MongoDB client promise
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create the client without relying on the global object
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the client promise to be used in other parts of the application
export default clientPromise;

// Interface for the User object
export interface User {
  _id?: string;
  username: string;
  password: string;
  loggedIn: boolean;
  lastLoginTime: Date;
}

