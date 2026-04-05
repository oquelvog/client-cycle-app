import { Milestone } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  milestone: Milestone;
  topPx: number;
  heightPx: number;
}

export function MilestoneBlock({ milestone, topPx, heightPx }: Props) {
  return (
    <div
      className={cn(
        "absolute right-0 rounded-l-md flex flex-col justify-start px-2 pt-1.5 overflow-hidden",
        "border-r-2 transition-all"
      )}
      style={{
        top: topPx,
        height: heightPx,
        backgroundColor: milestone.color + "22",
        borderColor: milestone.color,
        width: "calc(100% - 4px)",
      }}
    >
      <span
        className="text-xs font-semibold leading-tight truncate"
        style={{ color: milestone.color }}
      >
        {milestone.title}
      </span>
      {heightPx > 30 && milestone.description && (
        <span className="text-[10px] text-gray-400 truncate mt-0.5">
          {milestone.description}
        </span>
      )}
    </div>
  );
}
