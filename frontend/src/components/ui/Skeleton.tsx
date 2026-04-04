import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="読み込み中"
      className={cn('animate-pulse bg-gray-200 rounded', className)}
    />
  )
}
