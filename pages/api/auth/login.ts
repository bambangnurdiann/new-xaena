import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from '@/lib/mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ message: 'Missing required fields' })
      return
    }

    try {
      const client = await clientPromise
      const db = client.db('mydatabase')

      // Find the user by email
      const user = await db.collection('users').findOne({ email })

      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' })
        return
      }

      // Compare the plain-text password for now (if using plain text)
      // If you're hashing passwords, you'd need to compare hashes
      if (user.password !== password) {
        res.status(401).json({ message: 'Invalid email or password' })
        return
      }

      // Login successful
      res.status(200).json({ message: 'Login successful', userId: user._id })
    } catch (err) {
      console.error('Error in login API:', err)
      res.status(500).json({ message: 'Internal Server Error' })
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' })
  }
}
