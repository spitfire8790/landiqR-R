export interface Group {
  id: string
  name: string
  description: string
}

export interface Category {
  id: string
  name: string
  description: string
  groupId: string // Required field to link to a group
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
