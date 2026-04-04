import { cn } from '@/lib/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

export function Card({ padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-lg shadow', paddingMap[padding], className)}
      {...rest}
    >
      {children}
    </div>
  )
}
