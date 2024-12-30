import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("xaena_debug")
    const ticketsCollection = db.collection('tickets')
    const closedTicketsCollection = db.collection('closed_tickets')
    const usersCollection = db.collection('login_user')

    // Get today's start and end timestamps
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const ticketsPipeline = [
      {
        $match: {
          $or: [
            { lastAssignedTime: { $gte: today, $lt: tomorrow } },
            { 
              $and: [
                { status: 'Completed' },
                { lastUpdated: { $gte: today, $lt: tomorrow } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          parsedLastAssignedTime: {
            $cond: {
              if: { $eq: [{ $type: "$lastAssignedTime" }, "string"] },
              then: { $dateFromString: { dateString: "$lastAssignedTime", onError: null } },
              else: "$lastAssignedTime"
            }
          },
          parsedLastUpdated: {
            $cond: {
              if: { $eq: [{ $type: "$lastUpdated" }, "string"] },
              then: { $dateFromString: { dateString: "$lastUpdated", onError: null } },
              else: "$lastUpdated"
            }
          }
        }
      },
      {
        $project: {
          Incident: 1,
          assignedTo: 1,
          status: 1,
          parsedLastAssignedTime: 1,
          parsedLastUpdated: 1,
          elapsedTime: {
            $cond: [
              { $eq: ["$status", "Completed"] },
              { $subtract: ["$parsedLastUpdated", "$parsedLastAssignedTime"] },
              { $subtract: [new Date(), "$parsedLastAssignedTime"] }
            ]
          }
        }
      }
    ]

    const closedTicketsPipeline = [
      {
        $match: {
          closedAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $addFields: {
          parsedLastAssignedTime: {
            $cond: {
              if: { $eq: [{ $type: "$lastAssignedTime" }, "string"] },
              then: { $dateFromString: { dateString: "$lastAssignedTime", onError: null } },
              else: "$lastAssignedTime"
            }
          },
          parsedClosedAt: {
            $cond: {
              if: { $eq: [{ $type: "$closedAt" }, "string"] },
              then: { $dateFromString: { dateString: "$closedAt", onError: null } },
              else: "$closedAt"
            }
          }
        }
      },
      {
        $project: {
          Incident: 1,
          assignedTo: 1,
          status: { $literal: "Closed" },
          parsedLastAssignedTime: 1,
          parsedClosedAt: 1,
          elapsedTime: { $subtract: ["$parsedClosedAt", "$parsedLastAssignedTime"] }
        }
      }
    ]

    const ticketsData = await ticketsCollection.aggregate(ticketsPipeline).toArray()
    const closedTicketsData = await closedTicketsCollection.aggregate(closedTicketsPipeline).toArray()

    const allTickets = [...ticketsData, ...closedTicketsData]

    const userPerformance = allTickets.reduce((acc, ticket) => {
      const username = ticket.assignedTo
      if (!acc[username]) {
        acc[username] = {
          username,
          totalTickets: 0,
          totalTime: 0,
          activeTickets: 0,
          activeTicketDetails: []
        }
      }

      acc[username].totalTickets++
      acc[username].totalTime += ticket.elapsedTime

      if (ticket.status === 'Active') {
        acc[username].activeTickets++
        acc[username].activeTicketDetails.push({
          Incident: ticket.Incident,
          lastAssignedTime: ticket.parsedLastAssignedTime.toISOString(),
          elapsedTime: ticket.elapsedTime / 60000 // Convert to minutes
        })
      }

      return acc
    }, {})

    const userPerformanceArray = Object.values(userPerformance).map((user: any) => ({
      ...user,
      averageTime: user.totalTickets > 0 ? user.totalTime / user.totalTickets / 60000 : null // Convert to minutes
    }))

    console.log('User Performance:', JSON.stringify(userPerformanceArray, null, 2))

    return NextResponse.json(userPerformanceArray)
  } catch (error) {
    console.error('Error fetching user performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

