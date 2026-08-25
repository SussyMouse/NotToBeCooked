import { useState, useMemo } from "react"
import { useAuth } from "../../context/auth-context"
import { useTheme, type Theme } from "../../context/theme-context"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../dropdown-menu"
import { Avatar, AvatarFallback } from "../avatar"
import { UserProfileDialog } from "./UserProfileDialog"
import {
  User,
  LogOut,
  Palette,
  ChevronDown,
} from "lucide-react"

interface UserProfileDropdownProps {
  onLogout: () => void
}

export function UserProfileDropdown({ onLogout }: UserProfileDropdownProps) {
  const { user } = useAuth()
  const { theme, setTheme, themes } = useTheme()
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)

  const displayName = user?.display_name || user?.email?.split("@")[0] || "Student"
  const email = user?.email || "student@notobecooked.ai"

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

  const currentThemeOption = useMemo(() => {
    return themes.find((t) => t.id === theme) || themes[0]!
  }, [themes, theme])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="group flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-(--bg-raise,#1C2833)/70 py-1 pl-1.5 pr-2.5 text-xs text-(--tx,#DCE3EA) transition-all hover:bg-(--bg-hover,#213040) outline-none focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA)/50"
        >
          <Avatar className="h-7 w-7 transition-transform group-hover:scale-105">
            <AvatarFallback className="bg-(--acc,#52A8EA)/20 text-[11px] font-bold text-(--acc,#52A8EA)">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="hidden flex-col items-start text-left sm:flex">
            <span className="max-w-30 truncate text-xs font-semibold text-(--tx-strong,#EDF2F6) leading-tight">
              {displayName}
            </span>
            <span className="max-w-30 truncate text-[10px] text-(--tx-faint,#5C6976)">
              {currentThemeOption.name}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-(--tx-faint,#5C6976) transition-transform group-data-popup-open:rotate-180" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-64 rounded-xl border-0 bg-(--bg-panel,#121A23) p-1.5 text-(--tx,#DCE3EA) shadow-2xl backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5"
        >
          {/* User Info Header */}
          <div className="flex items-center gap-3 border-b border-(--line-soft,#1B2530)/40 px-2.5 py-2.5">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-(--acc,#52A8EA)/20 text-xs font-bold text-(--acc,#52A8EA)">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-bold text-(--tx-strong,#EDF2F6)">
                {displayName}
              </span>
              <span className="truncate text-[11px] text-(--tx-faint,#5C6976)">
                {email}
              </span>
            </div>
          </div>

          <div className="pt-1">
            <DropdownMenuGroup>
              {/* Profile Details Dialog Trigger */}
              <DropdownMenuItem
                onClick={() => setIsProfileDialogOpen(true)}
                className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
              >
                <User className="h-4 w-4 text-(--acc,#52A8EA)" />
                <div className="flex flex-col">
                  <span>User Profile & Info</span>
                  <span className="text-[10px] text-(--tx-faint,#5C6976)">
                    View academic details & status
                  </span>
                </div>
              </DropdownMenuItem>

              {/* Theme Submenu using shadcn components */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)">
                  <Palette className="h-4 w-4 text-(--cite,#E3A63F)" />
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex flex-col">
                      <span>Switch Theme</span>
                      <span className="text-[10px] text-(--tx-faint,#5C6976)">
                        {currentThemeOption.name}
                      </span>
                    </div>
                  </div>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="w-56 rounded-xl border-0 bg-(--bg-panel,#121A23) p-1 text-(--tx,#DCE3EA) shadow-2xl backdrop-blur-md ring-1 ring-black/5 dark:ring-white/5">
                  <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-(--tx-faint,#5C6976)">
                    Color Palettes
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-(--line-soft,#1B2530)/40" />

                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(val) => setTheme(val as Theme)}
                  >
                    {themes.map((opt) => (
                      <DropdownMenuRadioItem
                        key={opt.id}
                        value={opt.id}
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <div className="flex flex-col flex-1">
                          <span
                            className={
                              theme === opt.id
                                ? "font-bold text-(--acc,#52A8EA)"
                                : ""
                            }
                          >
                            {opt.name}
                          </span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-1 bg-(--line-soft,#1B2530)/40" />

            {/* Logout Action */}
            <DropdownMenuItem
              variant="destructive"
              onClick={onLogout}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-(--danger,#E0625C) transition-colors hover:bg-(--danger,#E0625C)/15 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile Full Modal */}
      <UserProfileDialog
        isOpen={isProfileDialogOpen}
        onClose={() => setIsProfileDialogOpen(false)}
        onLogout={onLogout}
      />
    </>
  )
}
