'use client'

import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface PerformanceChartProps {
  data: Array<{
    username: string | null
    totalTickets: number
  }>
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = {
    labels: data.map(user => user.username || 'Unknown'),
    datasets: [
      {
        label: 'Total Tickets Today',
        data: data.map(user => user.totalTickets),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      }
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'User Performance Overview (Today)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  return <Bar options={options} data={chartData} />
}

