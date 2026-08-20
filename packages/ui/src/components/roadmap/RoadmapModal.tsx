import type { Milestone, MockCourse } from "../../types/course"

interface RoadmapModalProps {
  isOpen: boolean
  course: MockCourse
  roadmap: Milestone[]
  progressPct: number
  doneCount: number
  totalCount: number
  onToggleMilestone: (index: number) => void
  onClose: () => void
}

export function RoadmapModal({
  isOpen,
  course,
  roadmap,
  progressPct,
  doneCount,
  totalCount,
  onToggleMilestone,
  onClose,
}: RoadmapModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg animate-in flex-col overflow-hidden rounded-xl border border-(--line,#25313E) bg-(--bg-panel,#121A23) shadow-2xl duration-150 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-(--line-soft,#1B2530) p-4">
          <div>
            <h3 className="text-sm font-bold text-(--tx,#DCE3EA)">
              {course.code} — Learning Roadmap
            </h3>
            <p className="mt-0.5 text-xs text-(--tx-faint,#5C6976)">
              Semester {course.semester}, 2026 · {course.weeks} teaching weeks ·
              tick a milestone to update progress
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-(--tx-faint,#5C6976) hover:bg-(--bg-raise,#1C2833) hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Modal Stats 3-Column Grid */}
        <div className="grid grid-cols-3 divide-x divide-(--line-soft,#1B2530) border-b border-(--line-soft,#1B2530) bg-(--bg-bar,#101821)/50 py-3 text-center">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-(--tx-faint,#5C6976) uppercase">
              Completion
            </span>
            <span className="font-mono text-base font-bold text-(--ok,#38A169)">
              {progressPct}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-(--tx-faint,#5C6976) uppercase">
              Milestones
            </span>
            <span className="font-mono text-base font-bold text-(--tx,#DCE3EA)">
              {doneCount}
              <small className="text-xs text-(--tx-faint,#5C6976)">
                {" "}
                / {totalCount}
              </small>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-(--tx-faint,#5C6976) uppercase">
              Current Week
            </span>
            <span className="font-mono text-base font-bold text-(--tx,#DCE3EA)">
              {course.week}
              <small className="text-xs text-(--tx-faint,#5C6976)">
                {" "}
                / {course.weeks}
              </small>
            </span>
          </div>
        </div>

        {/* Milestones Checklist Body */}
        <div className="flex max-h-80 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col gap-1.5 overflow-y-auto p-3">
          {roadmap.map((m, idx) => {
            const isDone = m.s === 1
            const isNow = m.now && !isDone
            return (
              <div
                key={idx}
                onClick={() => onToggleMilestone(idx)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-2.5 text-xs transition-colors ${
                  isDone
                    ? "border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/40 text-(--tx-faint,#5C6976)"
                    : isNow
                      ? "border-(--acc,#52A8EA)/30 bg-(--acc,#52A8EA)/5 text-(--tx,#DCE3EA)"
                      : "border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833) text-(--tx-dim,#8B98A7) hover:border-(--line,#25313E)"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Checkbox Box */}
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isDone
                        ? "border-(--ok,#38A169) bg-(--ok,#38A169) text-[10px] font-bold text-white"
                        : "border-(--line,#25313E) bg-(--bg-bar,#101821)"
                    }`}
                  >
                    {isDone && "✓"}
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <span className="font-mono text-[10px] text-(--tx-faint,#5C6976)">
                      {m.w}
                    </span>
                    <span
                      className={`truncate text-xs ${
                        isDone
                          ? "line-through opacity-70"
                          : "font-medium text-(--tx,#DCE3EA)"
                      }`}
                    >
                      {m.n}
                    </span>
                  </div>
                </div>

                {/* Tag badge */}
                {m.tag === "exam" ? (
                  <span className="shrink-0 rounded border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-400">
                    EXAM
                  </span>
                ) : isNow ? (
                  <span className="shrink-0 rounded border border-(--acc,#52A8EA)/30 bg-(--acc,#52A8EA)/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-(--acc,#52A8EA)">
                    THIS WEEK
                  </span>
                ) : isDone ? (
                  <span className="shrink-0 font-mono text-[9px] text-(--ok,#38A169)">
                    DONE
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Target Footer */}
        <div className="flex items-center gap-2 border-t border-(--line-soft,#1B2530) bg-(--bg-bar,#101821) p-3 text-xs text-(--tx-dim,#8B98A7)">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-(--acc,#52A8EA)"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M8 5v3.5l2.5 1.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-xs">
            This week:{" "}
            <strong className="text-(--tx,#DCE3EA)">{course.target}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
