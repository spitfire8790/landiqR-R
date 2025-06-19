export interface Group {
  id: string
  name: string
  description: string
  icon?: string // Icon name for the group
}

export interface Category {
  id: string
  name: string
  description: string
  groupId: string // Required field to link to a group
  sourceLink?: string // Optional link to source material
}

export interface Person {
  id: string
  name: string
  email: string
  organisation: string
  role: string
}

export interface Allocation {
  id: string
  categoryId: string
  personId: string
  isLead?: boolean
}

export interface Task {
  id: string
  name: string
  description: string
  categoryId: string
  hoursPerWeek: number
  createdAt: string
  sourceLinks?: TaskSourceLink[] // Array of source links
}

export interface TaskSourceLink {
  id: string
  taskId: string
  url: string
  description?: string
  createdAt: string
}

export interface Responsibility {
  id: string
  description: string
  taskId: string
  assignedPersonId?: string
  estimatedWeeklyHours: number
  createdAt: string
}

export interface TaskAllocation {
  id: string
  taskId: string
  personId: string
  isLead?: boolean
  estimatedWeeklyHours: number
  createdAt: string
}

// Realtime chat message
export interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  author_email: string
}

// Workflow system types
export interface WorkflowTool {
  id: string
  name: string
  description: string
  icon?: string
  category: string // e.g., 'analysis', 'communication', 'data-processing'
  createdAt: string
}

export interface WorkflowStepLink {
  id: string
  url: string
  description: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  taskId: string
  flowData: string // JSON stringified React Flow data
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkflowNode {
  id: string
  type: 'person' | 'tool' | 'decision' | 'start' | 'end'
  position: { x: number; y: number }
  data: {
    label: string
    personId?: string
    toolId?: string
    description?: string
    links?: WorkflowStepLink[]
    [key: string]: any
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
  data?: {
    condition?: string
    [key: string]: any
  }
}

export interface WorkflowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: { x: number; y: number; zoom: number }
}
