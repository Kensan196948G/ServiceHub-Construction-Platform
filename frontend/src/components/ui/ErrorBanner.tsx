import { cn } from "@/lib/cn";

interface ErrorBannerProps {
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ErrorBanner({
  message = "データの取得に失敗しました。",
  children,
  className,
}: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm",
        className
      )}
      role="alert"
    >
      {children ?? message}
    </div>
  );
}

interface ErrorTextProps {
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ErrorText({
  message,
  children,
  className,
}: ErrorTextProps) {
  return (
    <p className={cn("text-red-600 text-sm", className)} role="alert">
      {children ?? message}
    </p>
  );
}
