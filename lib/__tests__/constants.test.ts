import { describe, it, expect } from 'vitest'
import { BRAND_NAME, DEFAULT_PAGE_SIZE, MAX_EXPORT_ROWS } from '../constants'

describe('Constants', () => {
  it('should have correct brand name', () => {
    expect(BRAND_NAME).toBe('Land iQ - Project Management')
  })

  it('should have reasonable default page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0)
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(50)
  })

  it('should have reasonable max export rows', () => {
    expect(MAX_EXPORT_ROWS).toBeGreaterThan(100)
    expect(MAX_EXPORT_ROWS).toBeLessThanOrEqual(100000)
  })
}) 