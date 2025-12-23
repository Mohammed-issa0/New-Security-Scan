'use client';

import * as React from "react"
import Link from "next/link"
import { Shield, ArrowRight } from "lucide-react"
import { Container, Section, GradientText } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { buttonInteraction } from "../scans/ui"

export function Personas() {
  const t = useTranslations('landing.personas') 
  
  return (
    <Section>
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('title')}</h2>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="text-center p-6 space-y-4">
              <h4 className="font-bold text-gray-900">{t(`items.${idx}.title`)}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`items.${idx}.benefit`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function FinalCTA() {
  const t = useTranslations('landing.cta')
  const bt = useTranslations('common.buttons')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <Section className="pb-0">
      <Container>
        <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-20 text-center text-white relative overflow-hidden">
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {t('title')}
            </h2>
            <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href={`/${locale}/scans/new`}>
                <motion.button 
                  {...buttonInteraction}
                  className="w-full sm:w-auto px-10 py-5 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-gray-50 transition-all"
                >
                  {bt('createAccount')}
                </motion.button>
              </Link>
              <Link href={`/${locale}/scans/new`}>
                <motion.button 
                  {...buttonInteraction}
                  className="w-full sm:w-auto px-10 py-5 bg-blue-700 text-white rounded-full font-bold text-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  {bt('startFirstScan')} <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
                </motion.button>
              </Link>
            </div>
            <p className="text-blue-200 text-sm">{t('joined')}</p>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export function Footer() {
  const t = useTranslations('common')
  const locale = useLocale()

  return (
    <footer className="pt-20 pb-10 border-t border-gray-100 mt-20">
      <Container>
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-6">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <Shield size={22} fill="currentColor" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">{t('title')}</span>
            </Link>
            <p className="text-gray-500 max-w-sm leading-relaxed">
              The unified cloud interface for industry-proven security scanners. Built for developers and security teams who value speed and simplicity.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Product</h5>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-blue-600 cursor-pointer">{t('nav.features')}</li>
              <li className="hover:text-blue-600 cursor-pointer">{t('nav.tools')}</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-widest">Legal</h5>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-blue-600 cursor-pointer">Privacy Policy</li>
              <li className="hover:text-blue-600 cursor-pointer">Terms of Service</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">© 2025 {t('title')}. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  )
}

