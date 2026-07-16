import clsx from "clsx";
import { INDICATOR_COLOR_OPTIONS } from "@/lib/indicatorColors";

interface Props {
  value: string;
  onChange: (color: string) => void;
  options?: readonly string[];
  size?: "sm" | "md";
}

export function ColorSwatchPicker({
  value,
  onChange,
  options = INDICATOR_COLOR_OPTIONS,
  size = "md",
}: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={`Color ${color}`}
          className={clsx(
            "rounded-full border-2 transition-transform hover:scale-110",
            size === "sm" ? "h-4 w-4" : "h-6 w-6",
            value === color
              ? "border-white ring-2 ring-accent ring-offset-1 ring-offset-bg"
              : "border-transparent",
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
