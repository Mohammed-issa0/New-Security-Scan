'use client'

import * as React from "react"
import Link from "next/link"
import { Shield, Menu, X, ArrowRight, LayoutDashboard, Target, History, LogOut, User, CreditCard, FolderKanban } from "lucide-react"
import { Container } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { LanguageSwitcher } from "../layout/LanguageSwitcher"
import { motion, AnimatePresence } from "framer-motion"
import { tokenStore } from "@/lib/auth/tokenStore"
import { authService } from "@/lib/auth/authService"
import Image from "next/image"
import logo from "/public/imgs/logo1234.png"
export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const t = useTranslations('common')
  const tScans = useTranslations('landing.scans')
  const tTargets = useTranslations('landing.targets')
  const tJiraProjects = useTranslations('landing.jiraProjects')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  React.useEffect(() => {
    setIsAuthenticated(!!tokenStore.getTokens()?.accessToken)
    return tokenStore.subscribe((tokens) => {
      setIsAuthenticated(!!tokens?.accessToken)
    })
  }, [])

  React.useEffect(() => {
    let isMounted = true

    const checkAdmin = async () => {
      try {
        const profile = await authService.getMe()
        const hasAdminRole = profile.roles?.some((role) => role.toLowerCase().includes('admin'))
        if (isMounted) setIsAdmin(!!hasAdminRole)
      } catch {
        if (isMounted) setIsAdmin(false)
      }
    }

    if (isAuthenticated) {
      checkAdmin()
    } else {
      setIsAdmin(false)
    }

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    authService.logout()
  }

  return (
    <nav className="fixed w-full z-50 border-b border-white/8 bg-[rgba(6,11,20,0.72)] backdrop-blur-xl">
      <Container>
        <div className="flex justify-between items-center h-20">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/6 shadow-[0_0_24px_rgba(0,209,255,0.16)] ring-1 ring-cyan-300/12">
              <Image
                src={logo}
                alt="Black Brains"
                width={44}
                height={44}
                className="h-full w-full object-contain p-1"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold uppercase tracking-[0.32em] text-text-primary">Black Brains</div>
              <div className="text-xs text-text-secondary">AI Security Testing</div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {!isAuthenticated ? (
              <>
                <Link href="#features" className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors">{t('nav.features')}</Link>
                <Link href="#tools" className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors">{t('nav.tools')}</Link>
                <Link href="#plans" className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors">{t('nav.plans')}</Link>
                <Link href="#how-it-works" className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors">{t('nav.howItWorks')}</Link>
              </>
            ) : (
              <>
                <Link href={`/${locale}/scans`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <History size={16} />
                  {tScans('title')}
                </Link>
                <Link href={`/${locale}/targets`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <Target size={16} />
                  {tTargets('title')}
                </Link>
                <Link href={`/${locale}/jira/projects`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <FolderKanban size={16} />
                  {tJiraProjects('title')}
                </Link>
                <Link href={`/${locale}/profile`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <User size={16} />
                  {t('nav.profile')}
                </Link>
                <Link href={`/${locale}/billing`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <CreditCard size={16} />
                  {t('nav.billing')}
                </Link>
                <Link href={`/${locale}/plans`} className="text-sm font-medium text-text-secondary hover:text-cyan-300 transition-colors">
                  {t('nav.plans')}
                </Link>
              </>
            )}
            
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <Link href={`/${locale}/admin`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2.5 text-text-secondary hover:text-cyan-300 hover:bg-white/5 rounded-full transition-colors"
                        title="Admin"
                      >
                        <LayoutDashboard size={20} />
                      </motion.button>
                    </Link>
                  )}
                  <Link href={`/${locale}/scans/new`}>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 px-5 py-2.5 rounded-full text-sm font-bold shadow-glow hover:shadow-[0_0_34px_rgba(0,209,255,0.28)] transition-all flex items-center gap-2"
                    >
                      {t('nav.startScanning')} 
                      <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />
                    </motion.button>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="p-2.5 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-full transition-colors"
                    title="Logout"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link href={`/${locale}/login`}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="border border-cyan-400/28 bg-white/5 text-text-primary px-6 py-2.5 rounded-full text-sm font-bold hover:bg-white/8 transition-all"
                  >
                    {t('buttons.getStarted')}
                  </motion.button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button className="text-text-primary" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden pb-6 space-y-4 overflow-hidden"
            >
              {!isAuthenticated ? (
                <>
                    <Link href="#features" className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.features')}</Link>
                    <Link href="#tools" className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.tools')}</Link>
                    <Link href={`/${locale}/plans`} className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.plans')}</Link>
                    <Link href="#how-it-works" className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.howItWorks')}</Link>
                    <Link href={`/${locale}/login`} className="block bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 px-4 py-3 rounded-xl text-center font-bold shadow-glow">
                    {t('buttons.getStarted')}
                  </Link>
                </>
              ) : (
                <>
                  {isAdmin && (
                      <Link href={`/${locale}/admin`} className="block text-base font-medium text-text-secondary px-2 py-2">
                      Admin
                    </Link>
                  )}
                    <Link href={`/${locale}/scans`} className="block text-base font-medium text-text-secondary px-2 py-2">{tScans('title')}</Link>
                    <Link href={`/${locale}/targets`} className="block text-base font-medium text-text-secondary px-2 py-2">{tTargets('title')}</Link>
                    <Link href={`/${locale}/jira/projects`} className="block text-base font-medium text-text-secondary px-2 py-2">{tJiraProjects('title')}</Link>
                    <Link href={`/${locale}/profile`} className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.profile')}</Link>
                    <Link href={`/${locale}/billing`} className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.billing')}</Link>
                    <Link href={`/${locale}/plans`} className="block text-base font-medium text-text-secondary px-2 py-2">{t('nav.plans')}</Link>
                 
                    <Link href={`/${locale}/scans/new`} className="block bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 px-4 py-3 rounded-xl text-center font-bold shadow-glow">
                    {t('nav.startScanning')}
                  </Link>
                  
                  <button 
                    onClick={handleLogout}
                      className="w-full text-left px-2 py-2 text-status-danger font-medium"
                  >
                    Logout
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </nav>
  )
}


