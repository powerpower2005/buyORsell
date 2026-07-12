import clsx from "clsx";
import { INDICATOR_COLOR_OPTIONS } from "@/lib/indicatorColors";

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {INDICATOR_COLOR_OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          aria-label={`Color ${color}`}
          className={clsx(
            "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
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
