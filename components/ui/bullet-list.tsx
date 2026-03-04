import { cn } from "@/lib/utils";

interface BulletListProps {
  items: string[];
  itemClassName?: string;
  bulletClassName?: string;
}

export function BulletList({
  items,
  itemClassName = "text-zinc-600 dark:text-zinc-400",
  bulletClassName = "bg-zinc-400 dark:bg-zinc-500",
}: BulletListProps) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li
          key={item}
          className={cn("flex items-start gap-2 text-sm", itemClassName)}
        >
          <span
            className={cn(
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              bulletClassName
            )}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
