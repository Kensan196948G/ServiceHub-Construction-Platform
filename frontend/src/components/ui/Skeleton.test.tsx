import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  test('renders animate-pulse', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })
  test('renders bg-gray-200', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('bg-gray-200')
  })
  test('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    expect(container.firstChild).toHaveClass('h-4')
    expect(container.firstChild).toHaveClass('w-32')
  })
})
