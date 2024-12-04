"use client"

import { useTheme } from 'next-themes'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 200 },
  { name: 'Apr', value: 278 },
  { name: 'May', value: 189 },
]

export function CustomChart() {
  const { theme } = useTheme()

  const lineColor = theme === 'dark' ? '#8884d8' : '#82ca9d'
  const gridColor = theme === 'dark' ? '#555' : '#ccc'

  return (
    <LineChart width={500} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
      <XAxis dataKey="name" stroke={theme === 'dark' ? '#fff' : '#666'} />
      <YAxis stroke={theme === 'dark' ? '#fff' : '#666'} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: theme === 'dark' ? '#333' : '#fff',
          color: theme === 'dark' ? '#fff' : '#333'
        }} 
      />
      <Legend />
      <Line type="monotone" dataKey="value" stroke={lineColor} />
    </LineChart>
  )
}

