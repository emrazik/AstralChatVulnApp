"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, User, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/horoscope", label: "Horoscope" },
  { href: "/cards", label: "Cards" },
  { href: "/battle", label: "Battle" }
];

export function Navbar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const isAuthenticated = !!session?.authenticated;
  const [open, setOpen] = useState(false);

  const initials = session?.displayName
    ? session.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <nav className="sticky top-0 z-50 border-b border-indigo-400/20 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-astral-text"
        >
          <Sparkles className="h-5 w-5 text-astral-purple" />
          AstralChat
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-indigo-500/15 hover:text-astral-text",
                pathname === link.href
                  ? "bg-indigo-500/20 text-astral-indigo"
                  : "text-astral-textMuted"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 border border-indigo-400/30">
                  <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-200">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {session?.displayName && (
                  <>
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {session.displayName}
                      {session.zodiacSign && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({session.zodiacSign})
                        </span>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  render={<Link href="/profile" />}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-indigo-500 text-white hover:bg-indigo-600">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden rounded-lg p-2 outline-none hover:bg-muted/50">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-slate-900/95 backdrop-blur-md">
            <SheetTitle className="flex items-center gap-2 text-astral-text">
              <Sparkles className="h-4 w-4 text-astral-purple" />
              AstralChat
            </SheetTitle>
            <div className="mt-6 flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-indigo-500/15",
                    pathname === link.href
                      ? "bg-indigo-500/20 text-astral-indigo"
                      : "text-astral-textMuted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-border" />
              {isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-astral-textMuted hover:bg-indigo-500/15"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                      setOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm text-astral-textMuted hover:bg-indigo-500/15"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-astral-textMuted hover:bg-indigo-500/15"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-astral-textMuted hover:bg-indigo-500/15"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
