import { describe, expect, it } from 'vitest'
import axiosInstance from './axiosInstance'

describe('axiosInstance', () => {
  it('uses the backend development port when no API URL override is provided', () => {
    expect(axiosInstance.defaults.baseURL).toBe('http://localhost:8001/api')
  })
})
