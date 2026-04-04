import { cn } from "@/lib/cn";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-0",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-primary-500 focus:ring-primary-200",
        "disabled:bg-gray-50 disabled:text-gray-500",
        className,
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-0",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-primary-500 focus:ring-primary-200",
        "disabled:bg-gray-50 disabled:text-gray-500",
        className,
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-0",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
          : "border-gray-300 focus:border-primary-500 focus:ring-primary-200",
        "disabled:bg-gray-50 disabled:text-gray-500",
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
