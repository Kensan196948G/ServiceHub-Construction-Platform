import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  test('renders title and value', () => {
    render(<StatCard icon={<span>icon</span>} title="プロジェクト数" value={10} />)
    expect(screen.getByText('プロジェクト数')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  test('renders icon', () => {
    render(<StatCard icon={<span data-testid="icon">★</span>} title="test" value={0} />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  test('applies blue colorScheme', () => {
    const { container } = render(
      <StatCard icon={<span />} title="t" value={0} colorScheme="blue" />
    )
    expect(container.querySelector('.bg-blue-100')).toBeTruthy()
  })

  test('applies red colorScheme', () => {
    const { container } = render(
      <StatCard icon={<span />} title="t" value={0} colorScheme="red" />
    )
    expect(container.querySelector('.bg-red-100')).toBeTruthy()
  })

  test('renders trend up', () => {
    render(
      <StatCard
        icon={<span />}
        title="t"
        value={0}
        trend={{ value: 5.2, direction: 'up' }}
      />
    )
    expect(screen.getByText(/5\.2/)).toBeInTheDocument()
  })

  test('renders trend down', () => {
    render(
      <StatCard
        icon={<span />}
        title="t"
        value={0}
        trend={{ value: 3.1, direction: 'down' }}
      />
    )
    expect(screen.getByText(/3\.1/)).toBeInTheDocument()
  })

  test('does not render trend section when trend is undefined', () => {
    const { container } = render(<StatCard icon={<span />} title="t" value={0} />)
    expect(container.querySelector('[data-testid="trend"]')).toBeNull()
  })

  test('accepts string value', () => {
    render(<StatCard icon={<span />} title="t" value="92%" />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })
})
