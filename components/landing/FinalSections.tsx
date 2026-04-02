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
          <h2 className="text-3xl font-bold text-text-primary mb-4">{t('title')}</h2>
          <p className="text-text-secondary">{t('subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="cyber-card cyber-card-hover text-center p-6 rounded-2xl space-y-4">
              <h4 className="font-bold text-text-primary">{t(`items.${idx}.title`)}</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{t(`items.${idx}.benefit`)}</p>
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
        <div className="cyber-panel rounded-[2.5rem] p-8 md:p-20 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,209,255,0.18),transparent_52%)]" />
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              {t('title')}
            </h2>
            <p className="text-cyan-100 text-lg md:text-xl max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href={`/${locale}/scans/new`}>
                <motion.button 
                  {...buttonInteraction}
                  className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 text-slate-950 rounded-full font-bold text-lg hover:shadow-[0_0_38px_rgba(0,209,255,0.32)] transition-all"
                >
                  {bt('createAccount')}
                </motion.button>
              </Link>
              <Link href={`/${locale}/scans/new`}>
                <motion.button 
                  {...buttonInteraction}
                  className="w-full sm:w-auto px-10 py-5 bg-white/6 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  {bt('startFirstScan')} <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
                </motion.button>
              </Link>
            </div>
            <p className="text-cyan-100/80 text-sm">{t('joined')}</p>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export function Footer() {
  const t = useTranslations('common')
  const tf = useTranslations('landing.footer')
  const locale = useLocale()

  return (
    <footer className="pt-20 pb-10 border-t border-white/8 mt-20">
      <Container>
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-6">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-cyan-300 via-cyan-400 to-blue-400 rounded-lg text-slate-950 shadow-glow">
                <Shield size={22} fill="currentColor" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-text-primary">{t('title')}</span>
            </Link>
            <p className="text-text-secondary max-w-sm leading-relaxed">
              {tf('tagline')}
            </p>
          </div>
          
          <div>
            <h5 className="font-bold text-text-primary mb-6 uppercase text-xs tracking-widest">{tf('productTitle')}</h5>
            <ul className="space-y-4 text-sm text-text-secondary font-medium">
              <li>
                <Link href="#features" className="hover:text-cyan-300">{t('nav.features')}</Link>
              </li>
              <li>
                <Link href="#plans" className="hover:text-cyan-300">{t('nav.plans')}</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold text-text-primary mb-6 uppercase text-xs tracking-widest">{tf('legalTitle')}</h5>
            <ul className="space-y-4 text-sm text-text-secondary font-medium">
              <li className="hover:text-cyan-300 cursor-pointer">{tf('privacy')}</li>
              <li className="hover:text-cyan-300 cursor-pointer">{tf('terms')}</li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-muted">© 2025 {t('title')}. {tf('rights')}</p>
        </div>
      </Container>
    </footer>
  )
}


