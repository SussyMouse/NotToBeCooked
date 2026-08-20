interface RoadmapWidgetProps {
  week: number
  weeks: number
  progressPct: number
  nextMilestoneText: string
  onOpenRoadmap: () => void
}

export function RoadmapWidget({
  week,
  weeks,
  progressPct,
  nextMilestoneText,
  onOpenRoadmap,
}: RoadmapWidgetProps) {
  return (
    <div
      onClick={onOpenRoadmap}
      className="group flex cursor-pointer flex-col gap-2 rounded-lg bg-(--bg-raise,#1C2833)/40 p-2.5 transition-all hover:bg-(--bg-raise,#1C2833)/70 hover:shadow-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-(--tx,#DCE3EA)">
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            className="text-(--ok,#38A169)"
          >
            <path
              d="M2 11.5V8.2M5.7 11.5V4.5M9.3 11.5V6.4M13 11.5V2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>Course Roadmap</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="font-semibold text-(--ok,#38A169)">
            {progressPct}%
          </span>
          <span className="text-(--tx-faint,#5C6976)">·</span>
          <span className="text-(--tx-dim,#8B98A7)">
            W{week}/{weeks}
          </span>
        </div>
      </div>

      {/* Sleek Progress Bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-panel,#121A23)">
        <div
          style={{ width: `${progressPct}%` }}
          className="h-full rounded-full bg-(--ok,#38A169) transition-all duration-300"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-(--tx-faint,#5C6976)">
        <span className="truncate pr-2 group-hover:text-(--tx-dim,#8B98A7)">
          Next: {nextMilestoneText}
        </span>
        <span className="shrink-0 font-medium text-(--acc,#52A8EA) group-hover:underline">
          View ↗
        </span>
      </div>
    </div>
  )
}
