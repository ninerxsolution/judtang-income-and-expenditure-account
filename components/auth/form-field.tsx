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
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={!!error}
        className={cn(error && "border-destructive")}
      />
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  );
}
