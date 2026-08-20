import { useState } from "react"
import type { MockCourse } from "../../types/course"

interface TopBarProps {
  platform?: string
  currentCourse: MockCourse
  courses: MockCourse[]
  userEmail?: string
  onSwitchCourse: (courseId: string) => void
  onLogout: () => void
}

const YEARS = [1, 2, 3, 4]
const SEMESTERS = [1, 2]

export function TopBar({
  currentCourse,
  courses,
  userEmail,
  onSwitchCourse,
  onLogout,
}: TopBarProps) {
  const [openYearDropdown, setOpenYearDropdown] = useState(false)
  const [openSemDropdown, setOpenSemDropdown] = useState(false)
  const [openCourseDropdown, setOpenCourseDropdown] = useState(false)
  const [globalSearch, setGlobalSearch] = useState("")

  const selectedYear = currentCourse.year
  const selectedSem = currentCourse.semester

  const availableCoursesForScope = courses.filter(
    (c) => c.year === selectedYear && c.semester === selectedSem
  )
  const displayedCourses =
    availableCoursesForScope.length > 0 ? availableCoursesForScope : courses

  const closeAllDropdowns = () => {
    setOpenYearDropdown(false)
    setOpenSemDropdown(false)
    setOpenCourseDropdown(false)
  }

  return (
    <header
      onClick={closeAllDropdowns}
      className="relative z-20 flex h-12 flex-none items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-3.5 text-sm"
    >
      {/* Left: Scope Selectors (Year, Sem, Course) */}
      <div
        className="relative flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Year Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenYearDropdown(!openYearDropdown)
              setOpenSemDropdown(false)
              setOpenCourseDropdown(false)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/70 px-2.5 py-1.5 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <span>Year {selectedYear}</span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              className="text-(--tx-faint,#5C6976)"
            >
              <path
                d="M2 4l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openYearDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-32 flex-col rounded-lg border border-(--line,#25313E) bg-(--bg-panel,#121A23) p-1 shadow-2xl">
              {YEARS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    const target =
                      courses.find((c) => c.year === yr) || courses[0]!
                    onSwitchCourse(target.id)
                    setOpenYearDropdown(false)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedYear === yr
                      ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                  }`}
                >
                  <span>Year {yr}</span>
                  {selectedYear === yr && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sem Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenSemDropdown(!openSemDropdown)
              setOpenYearDropdown(false)
              setOpenCourseDropdown(false)
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/70 px-2.5 py-1.5 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <span>Sem {selectedSem}</span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              className="text-(--tx-faint,#5C6976)"
            >
              <path
                d="M2 4l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openSemDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-32 flex-col rounded-lg border border-(--line,#25313E) bg-(--bg-panel,#121A23) p-1 shadow-2xl">
              {SEMESTERS.map((sm) => (
                <button
                  key={sm}
                  type="button"
                  onClick={() => {
                    const target =
                      courses.find(
                        (c) => c.year === selectedYear && c.semester === sm
                      ) ||
                      courses.find((c) => c.semester === sm) ||
                      courses[0]!
                    onSwitchCourse(target.id)
                    setOpenSemDropdown(false)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                    selectedSem === sm
                      ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                  }`}
                >
                  <span>Sem {sm}</span>
                  {selectedSem === sm && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Course Selection Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setOpenCourseDropdown(!openCourseDropdown)
              setOpenYearDropdown(false)
              setOpenSemDropdown(false)
            }}
            className="flex max-w-72 cursor-pointer items-center gap-2 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-3 py-1.5 text-xs text-(--tx,#DCE3EA) shadow-sm transition-colors hover:border-(--acc,#52A8EA)/40 hover:bg-(--bg-hover,#213040)"
          >
            <span className="font-bold text-(--acc,#52A8EA)">
              {currentCourse.code}
            </span>
            <span className="truncate font-medium text-(--tx-dim,#8B98A7)">
              {currentCourse.name}
            </span>
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              className="shrink-0 text-(--tx-faint,#5C6976)"
            >
              <path
                d="M2 4l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {openCourseDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-80 flex-col rounded-lg border border-(--line,#25313E) bg-(--bg-panel,#121A23) p-1.5 shadow-2xl">
              <div className="px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-wider text-(--tx-faint,#5C6976) uppercase">
                Enrolled Courses · Year {selectedYear} Sem {selectedSem}
              </div>
              {displayedCourses.map((c) => {
                const isSelected = c.id === currentCourse.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSwitchCourse(c.id)
                      setOpenCourseDropdown(false)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-(--acc,#52A8EA)/15 font-semibold text-(--acc,#52A8EA)"
                        : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{c.code}</span>
                      <span className="truncate text-[11px] text-(--tx-faint,#5C6976)">
                        {c.name}
                      </span>
                    </div>
                    {isSelected && <span className="text-xs font-bold">✓</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Center: Brand Logo & Title (Moved to middle) */}
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 sm:pointer-events-auto">
        <img
          src="/ntbc-logo.png"
          alt="NotToBeCooked Logo"
          className="h-6 w-6 rounded object-contain"
        />
        <span className="text-[15px] font-bold tracking-wide text-(--tx,#DCE3EA)">
          NotToBeCooked
        </span>
      </div>

      {/* Right: Horizontally Expanded Search Bar & Actions */}
      <div className="flex items-center gap-3">
        <div className="flex w-64 items-center gap-2 rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/70 px-3 py-1.5 text-xs text-(--tx-faint,#5C6976) transition-colors focus-within:border-(--acc,#52A8EA)/50 focus-within:bg-(--bg-raise,#1C2833) md:w-80 lg:w-96">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-(--tx-faint,#5C6976)"
          >
            <path
              d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search across all course files..."
            className="w-full bg-transparent text-xs text-(--tx,#DCE3EA) outline-none placeholder:text-(--tx-faint,#5C6976)"
          />
          <kbd className="shrink-0 rounded border border-(--line,#25313E) bg-(--bg-bar,#101821) px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </div>

        {userEmail && (
          <span className="hidden text-xs font-medium text-(--tx-dim,#8B98A7) xl:inline">
            {userEmail}
          </span>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="cursor-pointer rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833) px-3 py-1.5 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:border-destructive hover:text-white"
        >
          Log Out
        </button>
      </div>
    </header>
  )
}
