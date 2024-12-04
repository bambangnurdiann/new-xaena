'use server'

import { cookies } from 'next/headers'
import clientPromise, { User } from '@/lib/mongodb'
import { v4 as uuidv4 } from 'uuid'  // For generating a unique session token

export async function login(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  const client = await clientPromise
  const db = client.db("xaena_db")
  const usersCollection = db.collection<User>('login_user')

  console.log("Attempting to find user:", username) // Debugging

  const user = await usersCollection.findOne({ username })

  if (user) {
    console.log("User found:", user) // Debugging
    if (user.password === password) {
      console.log("Password matches") // Debugging

      // Generate a unique session token
      const sessionToken = uuidv4()

      // Update the user's session token and login status in the database
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            loggedIn: true,
            sessionToken, 
            lastLoginTime: new Date() 
          }
        }
      )

      // Set cookies for the session and the user
      cookies().set('user', username, { secure: true, path: '/', httpOnly: true })
      cookies().set('session_token', sessionToken, { secure: true, path: '/', httpOnly: true })
      cookies().set('auth', 'true', { secure: true, httpOnly: true })

      console.log("Cookies set for user:", username) // Debugging
      return { success: true, sessionToken }
    } else {
      console.log("Password does not match") // Debugging
    }
  } else {
    console.log("User not found") // Debugging
  }

  return { success: false, error: 'Invalid username or password' }
}
