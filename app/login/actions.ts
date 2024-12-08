'use server'

import { cookies } from 'next/headers'
import clientPromise, { User } from '@/lib/mongodb'
import { v4 as uuidv4 } from 'uuid'

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  const client = await clientPromise
  const db = client.db("xaena_db")
  const usersCollection = db.collection<User>('login_user')

  console.log("Attempting to find user:", username)

  const user = await usersCollection.findOne({ username })

  if (user) {
    console.log("User found:", user)
    if (user.password === password) {
      console.log("Password matches")

      const sessionToken = uuidv4()
      const lastLoginTime = new Date()

      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            loggedIn: true,
            sessionToken, 
            lastLoginTime
          }
        }
      )

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      }

      cookies().set('user', username, cookieOptions)
      cookies().set('session_token', sessionToken, cookieOptions)
      cookies().set('auth', 'true', cookieOptions)
      cookies().set('last_login', lastLoginTime.toISOString(), cookieOptions)

      console.log("Cookies set for user:", username)
      return { success: true, sessionToken, userId: user._id.toString(), lastLoginTime: lastLoginTime.toISOString() }
    } else {
      console.log("Password does not match")
    }
  } else {
    console.log("User not found")
  }

  return { success: false, error: 'Invalid username or password' }
}

async function hashPassword(password: string): Promise<string> {
  // In a real application, you should use a proper hashing algorithm like bcrypt
  // This is just a placeholder
  return password
}

async function verifyPassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
  // In a real application, you should use a proper verification method
  // This is just a placeholder
  return plainTextPassword === hashedPassword
}

export async function createUser(username: string, password: string): Promise<boolean> {
  const client = await clientPromise
  const db = client.db("xaena_db")
  const usersCollection = db.collection<User>('login_user')

  const existingUser = await usersCollection.findOne({ username })
  if (existingUser) {
    return false // User already exists
  }

  const hashedPassword = await hashPassword(password)
  const result = await usersCollection.insertOne({
    username,
    password: hashedPassword,
    loggedIn: false,
    sessionToken: null,
    lastLoginTime: null
  })

  return result.acknowledged
}

export async function logoutUser(username: string): Promise<boolean> {
  const client = await clientPromise
  const db = client.db("xaena_db")
  const usersCollection = db.collection<User>('login_user')

  const result = await usersCollection.updateOne(
    { username },
    { 
      $set: { 
        loggedIn: false,
        sessionToken: null,
        lastLoginTime: null
      }
    }
  )

  return result.modifiedCount > 0
}

