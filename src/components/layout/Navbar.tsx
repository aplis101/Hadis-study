'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, BookOpen, User, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setIsAdmin(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (pathname === '/login') return null

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
          <BookOpen className="w-5 h-5" />
          <span className="hidden sm:inline">الحديث الشريف</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/' ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            الرئيسية
          </Link>
          {user && (
            <Link
              href="/profile"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/profile' ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              حسابي
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                pathname.startsWith('/admin') ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              المشرف
            </Link>
          )}
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
            >
              دخول
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden p-2 rounded-lg hover:bg-stone-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="القائمة"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-stone-200 bg-white px-4 py-2 space-y-1">
          <Link
            href="/"
            className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
            onClick={() => setMenuOpen(false)}
          >
            الرئيسية
          </Link>
          {user && (
            <Link
              href="/profile"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
              onClick={() => setMenuOpen(false)}
            >
              حسابي
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
              onClick={() => setMenuOpen(false)}
            >
              لوحة المشرف
            </Link>
          )}
          {user ? (
            <button
              onClick={() => { handleSignOut(); setMenuOpen(false) }}
              className="block w-full text-end px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
            >
              تسجيل الخروج
            </button>
          ) : (
            <Link
              href="/login"
              className="block w-full text-center px-3 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white"
              onClick={() => setMenuOpen(false)}
            >
              تسجيل الدخول
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
