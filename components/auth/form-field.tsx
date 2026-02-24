/**
 * Reusable form field: label + input + optional error message.
 */
type FormFieldProps = {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "date";
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoComplete?: string;
};

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export function FormField({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  error,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        autoComplete={autoComplete}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
