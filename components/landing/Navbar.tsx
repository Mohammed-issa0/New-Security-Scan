'use client'

import * as React from "react"
import Link from "next/link"
import { Shield, Menu, X, ArrowRight } from "lucide-react"
import { Container } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { LanguageSwitcher } from "../layout/LanguageSwitcher"
import { motion, AnimatePresence } from "framer-motion"

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false)
  const t = useTranslations('common')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <Container>
        <div className="flex justify-between items-center h-20">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Shield size={22} fill="currentColor" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">{t('title')}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">{t('nav.features')}</Link>
            <Link href="#tools" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">{t('nav.tools')}</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">{t('nav.howItWorks')}</Link>
            
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link href={`/${locale}/scans/new`}>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  {t('nav.startScanning')} 
                  <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <LanguageSwitcher />
            <button className="text-gray-900" onClick={() => setIsOpen(!isOpen)}>
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
              <Link href="#features" className="block text-base font-medium text-gray-600 px-2 py-2">{t('nav.features')}</Link>
              <Link href="#tools" className="block text-base font-medium text-gray-600 px-2 py-2">{t('nav.tools')}</Link>
              <Link href="#how-it-works" className="block text-base font-medium text-gray-600 px-2 py-2">{t('nav.howItWorks')}</Link>
              <Link href={`/${locale}/scans/new`} className="block bg-blue-600 text-white px-4 py-3 rounded-xl text-center font-bold">
                {t('buttons.getStarted')}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </nav>
  )
}

