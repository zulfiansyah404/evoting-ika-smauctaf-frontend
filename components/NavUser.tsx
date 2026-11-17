'use client'

import type { ComponentType } from 'react'
import { ChevronsUpDown, GraduationCap, KeyRound, LogOut } from 'lucide-react'
import { Avatar as RawAvatar, AvatarFallback as RawAvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent as RawDropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem as RawDropdownMenuItem,
  DropdownMenuLabel as RawDropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const Avatar = RawAvatar as ComponentType<any>
const AvatarFallback = RawAvatarFallback as ComponentType<any>
const DropdownMenuContent = RawDropdownMenuContent as ComponentType<any>
const DropdownMenuItem = RawDropdownMenuItem as ComponentType<any>
const DropdownMenuLabel = RawDropdownMenuLabel as ComponentType<any>

export interface NavUserProps {
  user: {
    name: string
    batchLabel?: string
  }
  onChangePassword: () => void
  onLogout: () => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'PM'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function NavUser({ user, onChangePassword, onLogout }: NavUserProps) {
  const initials = getInitials(user.name)
  const subtitle = user.batchLabel || 'Pemilih Terverifikasi'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto px-2.5 py-1.5 text-white hover:text-white hover:bg-white/10 data-[state=open]:bg-white/10 rounded-lg flex items-center gap-2.5"
        >
          <Avatar className="h-8 w-8 rounded-lg border border-gold/40">
            <AvatarFallback className="rounded-lg bg-gold/20 text-gold font-semibold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:grid text-left text-sm leading-tight max-w-[180px]">
            <span className="truncate font-semibold text-white">{user.name}</span>
            <span className="truncate text-[11px] text-gold/90 font-medium">{subtitle}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-white/70 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 rounded-xl" side="bottom" align="end" sideOffset={8}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-2.5 py-2 text-left text-sm">
            <Avatar className="h-9 w-9 rounded-lg border border-navy/15">
              <AvatarFallback className="rounded-lg bg-navy text-gold font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-navy">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {user.batchLabel && <GraduationCap className="h-3 w-3 shrink-0 text-gold-dark" />}
                <span className="truncate">{subtitle}</span>
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onChangePassword} className="cursor-pointer">
            <KeyRound className="mr-2 h-4 w-4 text-navy" />
            <span>Ubah Password</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
