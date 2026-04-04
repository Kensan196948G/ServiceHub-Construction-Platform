import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  test('renders children', () => {
    render(<Card>content</Card>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
  test('applies default padding md', () => {
    const { container } = render(<Card>x</Card>)
    expect(container.firstChild).toHaveClass('p-6')
  })
  test('applies padding sm', () => {
    const { container } = render(<Card padding="sm">x</Card>)
    expect(container.firstChild).toHaveClass('p-4')
  })
  test('applies padding none', () => {
    const { container } = render(<Card padding="none">x</Card>)
    expect(container.firstChild).not.toHaveClass('p-6')
    expect(container.firstChild).not.toHaveClass('p-4')
  })
  test('applies padding lg', () => {
    const { container } = render(<Card padding="lg">x</Card>)
    expect(container.firstChild).toHaveClass('p-8')
  })
  test('merges custom className', () => {
    const { container } = render(<Card className="custom">x</Card>)
    expect(container.firstChild).toHaveClass('custom')
  })
})
