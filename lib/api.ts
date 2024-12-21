// lib/api.ts

export const fetchTicketStats = async () => {
    const response = await fetch('/api/ticket-stats')
    if (!response.ok) {
      throw new Error('Failed to fetch ticket stats')
    }
    return response.json()
  }
  
  export const fetchLoggedInUsers = async () => {
    const response = await fetch('/api/logged-in-users')
    if (!response.ok) {
      throw new Error('Failed to fetch logged-in users')
    }
    return response.json()
  }
  