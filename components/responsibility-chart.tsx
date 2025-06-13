"use client"

import { useMemo } from "react"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js"
import type { Person, Allocation } from "@/lib/types"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ResponsibilityChartProps {
  people: Person[]
  allocations: Allocation[]
}

export default function ResponsibilityChart({ people, allocations }: ResponsibilityChartProps) {
  // Calculate the number of responsibilities per person
  const chartData = useMemo(() => {
    // Create a map of personId to count of allocations
    const responsibilityCounts: Record<string, number> = {}
    
    // Count allocations for each person
    allocations.forEach(allocation => {
      if (!responsibilityCounts[allocation.personId]) {
        responsibilityCounts[allocation.personId] = 0
      }
      responsibilityCounts[allocation.personId]++
    })
    
    // Sort people by number of responsibilities (descending)
    const sortedPeople = [...people].sort((a, b) => {
      const aCount = responsibilityCounts[a.id] || 0
      const bCount = responsibilityCounts[b.id] || 0
      
      // Primary sort by responsibility count (descending)
      if (aCount !== bCount) {
        return bCount - aCount
      }
      
      // Secondary sort by name (alphabetical) if counts are equal
      return a.name.localeCompare(b.name)
    })
    
    // Get organization colors
    const getOrgColor = (org: string) => {
      switch (org) {
        case "PDNSW":
          return "rgba(30, 64, 175, 0.7)" // blue-800
        case "WSP":
          return "rgba(185, 28, 28, 0.7)" // red-700
        case "Giraffe":
          return "rgba(217, 119, 6, 0.7)" // amber-600
        default:
          return "rgba(107, 114, 128, 0.7)" // gray-500
      }
    }
    
    // Prepare data for the chart
    const labels = sortedPeople.map(person => person.name)
    const backgroundColor = sortedPeople.map(person => getOrgColor(person.organisation))
    const data = sortedPeople.map(person => responsibilityCounts[person.id] || 0)
    
    return {
      labels,
      datasets: [
        {
          label: 'Number of Responsibilities',
          data,
          backgroundColor,
          borderColor: backgroundColor.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    }
  }, [people, allocations])
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any) => {
            const index = tooltipItems[0].dataIndex
            const person = people.find(p => p.name === chartData.labels[index])
            return `${person?.name} (${person?.organisation})`
          },
          label: (context: any) => {
            return `Responsibilities: ${context.raw}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Responsibilities'
        },
        ticks: {
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Person'
        }
      }
    }
  }
  
  // Create a legend for organizations
  const orgColors = {
    "PDNSW": "rgba(30, 64, 175, 0.7)",
    "WSP": "rgba(185, 28, 28, 0.7)",
    "Giraffe": "rgba(217, 119, 6, 0.7)"
  }
  
  const uniqueOrgs = Array.from(new Set(people.map(p => p.organisation)))
  
  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-lg font-medium mb-4">Responsibilities by Person</h3>
      
      {/* Organization Legend */}
      <div className="flex gap-4 mb-4">
        {uniqueOrgs.map(org => (
          <div key={org} className="flex items-center">
            <div 
              className="w-4 h-4 mr-2 rounded-sm" 
              style={{ backgroundColor: orgColors[org as keyof typeof orgColors] || "rgba(107, 114, 128, 0.7)" }}
            ></div>
            <span className="text-sm">{org}</span>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="flex-1 min-h-[400px]">
        <Bar data={chartData} options={options as any} />
      </div>
    </div>
  )
}
