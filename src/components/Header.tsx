"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "ホーム" },
  { href: "/medications", label: "お薬管理" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/settings", label: "設定" },
];

export default function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  if (!session) return null;

  return (
    <header className="bg-white dark:bg-surface-dark shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-primary"
          >
            くすりログ
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-danger transition-colors"
            >
              ログアウト
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="メニュー"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden pb-3 border-t border-gray-100 dark:border-gray-700">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium mt-1 ${
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 dark:text-gray-300"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="block w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 mt-1"
            >
              ログアウト
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
