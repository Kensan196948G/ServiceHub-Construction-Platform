import { cn } from '@/lib/cn'

interface TrendProps {
  value: number
  direction: 'up' | 'down' | 'neutral'
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: number | string
  trend?: TrendProps
  colorScheme?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

const colorSchemeMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
} as const

const trendConfig = {
  up: { symbol: '↑', className: 'text-green-600' },
  down: { symbol: '↓', className: 'text-red-600' },
  neutral: { symbol: '→', className: 'text-gray-500' },
} as const

export function StatCard({ icon, title, value, trend, colorScheme }: StatCardProps) {
  const iconColors = colorScheme ? colorSchemeMap[colorScheme] : 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', iconColors)}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
      {trend && (
        <div data-testid="trend" className="mt-3">
          <span className={cn('text-sm font-medium', trendConfig[trend.direction].className)}>
            {trendConfig[trend.direction].symbol} {Math.abs(trend.value).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}
