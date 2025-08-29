'use client'

import Link from 'next/link'
import { BookOpen, Wine, User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // Temporarily disable auth until Phase 2
  const session = null
  const status = 'unauthenticated'

  const navigationItems = [
    { href: '/', label: 'Home' },
    { href: '/books', label: 'Browse Books' },
    { href: '/about', label: 'About' },
  ]

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
              <BookOpen className="w-6 h-6 text-slate-900" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-amber-200">Booze</span>
              <span className="text-xl font-bold text-amber-200">&</span>
              <span className="text-xl font-bold text-amber-200">Books</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-slate-300 hover:text-amber-400 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="w-8 h-8 animate-pulse bg-slate-700 rounded-full" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-slate-300 hover:text-amber-400 transition-colors flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Button
                  onClick={() => {/* signOut() - will be implemented in Phase 2 */}}
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-secondary">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn-primary">
                  Join the Club
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-200"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <div className="space-y-4">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-slate-300 hover:text-amber-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {session ? (
                <div className="pt-4 border-t border-slate-700 space-y-2">
                  <Link
                    href="/dashboard"
                    className="block text-slate-300 hover:text-amber-400 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      /* signOut() - will be implemented in Phase 2 */
                      setIsMobileMenuOpen(false)
                    }}
                    className="block w-full text-left text-slate-300 hover:text-red-400 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-700 space-y-2">
                  <Link
                    href="/auth/login"
                    className="block btn-secondary text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block btn-primary text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Join the Club
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}