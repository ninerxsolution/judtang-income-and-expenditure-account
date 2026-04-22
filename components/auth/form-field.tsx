/**
 * Reusable form field: label + input + optional error message.
 * Uses shadcn Input and Label.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "date" | "number";
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  readOnly?: boolean;
  /** Leading box (e.g. currency symbol) with divider, full-width grouped control. */
  inputPrefix?: string;
};

export function FormField({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  error,
  autoComplete,
  maxLength,
  inputMode,
  placeholder,
  inputRef,
  readOnly,
  inputPrefix,
}: FormFieldProps) {
  const hasPrefix = Boolean(inputPrefix && inputPrefix.length > 0);

  const inputClassName = cn(
    error && !hasPrefix && "border-destructive",
    readOnly && !hasPrefix && "bg-muted/50",
    hasPrefix &&
      "h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
    hasPrefix && readOnly && "bg-muted/30",
    hasPrefix && error && "aria-invalid:border-0",
  );

  const inputEl = (
    <Input
      ref={inputRef}
      id={id}
      type={type}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      maxLength={maxLength}
      inputMode={inputMode}
      placeholder={placeholder}
      aria-invalid={!!error}
      readOnly={readOnly}
      className={inputClassName}
    />
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hasPrefix ? (
        <div
          className={cn(
            "flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow]",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
            error &&
              "border-destructive focus-within:border-destructive focus-within:ring-destructive/30 dark:focus-within:ring-destructive/40",
            readOnly && "bg-muted/30",
          )}
        >
          <span
            className="flex min-w-10 shrink-0 items-center justify-center border-r border-input bg-muted px-3 text-sm font-medium text-muted-foreground tabular-nums select-none dark:bg-muted/80"
            aria-hidden="true"
          >
            {inputPrefix}
          </span>
          {inputEl}
        </div>
      ) : (
        inputEl
      )}
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
