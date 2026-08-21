import { useMemo } from "react"
import { useAuth } from "../../context/auth-context"
import { useTheme } from "../../context/theme-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../dialog"
import { Avatar, AvatarFallback } from "../avatar"
import { Badge } from "../badge"
import { Button } from "../button"
import {
  Mail,
  Calendar,
  Sparkles,
  LogOut,
  Palette,
  ShieldCheck,
  BookOpen,
} from "lucide-react"

interface UserProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

export function UserProfileDialog({
  isOpen,
  onClose,
  onLogout,
}: UserProfileDialogProps) {
  const { user } = useAuth()
  const { theme, setTheme, themes } = useTheme()

  const displayName = user?.display_name || user?.email?.split("@")[0] || "Student"
  const initials = useMemo(() => {
    if (user?.display_name) {
      return user.display_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return "ST"
  }, [user])

  const memberSince = useMemo(() => {
    if (user?.created_at) {
      try {
        return new Date(user.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      } catch {
        return "Joined 2026"
      }
    }
    return "Spring 2026"
  }, [user])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-0 bg-(--bg-panel,#121A23) text-(--tx,#DCE3EA) shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        <DialogHeader className="sr-only">
          <DialogTitle>User Profile and Settings</DialogTitle>
          <DialogDescription>
            Account overview, academic track status, and appearance customization.
          </DialogDescription>
        </DialogHeader>
        {/* Header Hero Banner */}
        <div className="relative border-0 bg-gradient-to-r from-(--bg-raise,#1C2833) via-(--bg-bar,#101821) to-(--bg-panel,#121A23) p-6 pb-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 shadow-lg ring-2 ring-(--acc,#52A8EA)/25">
              <AvatarFallback className="bg-(--acc,#52A8EA)/20 text-lg font-bold text-(--acc,#52A8EA)">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-(--tx-strong,#EDF2F6) truncate">
                  {displayName}
                </h3>
                <Badge
                  variant="secondary"
                  className="bg-(--acc,#52A8EA)/15 text-(--acc,#52A8EA) border-0 text-[11px] font-semibold"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified Student
                </Badge>
              </div>

              <p className="text-xs text-(--tx-dim,#8B98A7) truncate mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-(--tx-faint,#5C6976) shrink-0" />
                <span>{user?.email || "student@university.edu"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Account Overview Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border-0 bg-(--bg-raise,#1C2833)/60 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--tx-faint,#5C6976) uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-(--acc,#52A8EA)" />
                <span>Enrolled</span>
              </div>
              <span className="text-xs font-semibold text-(--tx,#DCE3EA)">
                {memberSince}
              </span>
            </div>

            <div className="rounded-lg border-0 bg-(--bg-raise,#1C2833)/60 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--tx-faint,#5C6976) uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5 text-(--cite,#E3A63F)" />
                <span>Academic Track</span>
              </div>
              <span className="text-xs font-semibold text-(--tx,#DCE3EA)">
                Year 2 · Sem 2
              </span>
            </div>

            <div className="rounded-lg border-0 bg-(--bg-raise,#1C2833)/60 p-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-(--tx-faint,#5C6976) uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-(--ok,#4FB07C)" />
                <span>AI RAG Engine</span>
              </div>
              <span className="text-xs font-semibold text-(--ok,#4FB07C)">
                Active & Synced
              </span>
            </div>
          </div>

          {/* Theme & Appearance Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-(--acc,#52A8EA)" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-(--tx-strong,#EDF2F6)">
                  Theme & Visual Appearance
                </h4>
              </div>
              <span className="text-[11px] text-(--tx-faint,#5C6976)">
                Powered by shadcn & CSS Variables
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {themes.map((opt) => {
                const isSelected = theme === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`group relative flex flex-col items-start gap-2 rounded-lg p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-(--acc,#52A8EA) bg-(--acc,#52A8EA)/10 shadow-sm"
                        : "border-0 bg-(--bg-raise,#1C2833)/40 hover:bg-(--bg-hover,#213040)/60"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full shadow-inner shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span
                          className={`text-xs font-semibold ${
                            isSelected
                              ? "text-(--acc,#52A8EA)"
                              : "text-(--tx,#DCE3EA) group-hover:text-white"
                          }`}
                        >
                          {opt.name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--acc,#52A8EA) text-[10px] font-bold text-black">
                          ✓
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-(--tx-faint,#5C6976) line-clamp-2 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Relocated Logout */}
        <div className="flex items-center justify-between border-0 bg-(--bg-bar,#101821) px-6 py-3.5">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-0 bg-(--bg-raise,#1C2833) text-(--tx,#DCE3EA) hover:bg-(--bg-hover,#213040) cursor-pointer"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
