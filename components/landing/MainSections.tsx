'use client';

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Play, CheckCircle2, Shield, Search, Zap, Cpu, Server, Lock } from "lucide-react"
import { Container, Section, GradientText, FeatureCard, ToolBadge } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { buttonInteraction } from "../scans/ui"

export function Hero() {
  const t = useTranslations('landing.hero')
  const bt = useTranslations('common.buttons')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <Section className="pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-100/50 blur-[120px] rounded-full" />
      </div>

      <Container className="text-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8"
        >
          <Zap size={14} fill="currentColor" /> {t('badge')}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-[1.1]"
        >
          {t('headlinePrefix')} <br />
          <GradientText>{t('headlineGradient')}</GradientText>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 mb-10 leading-relaxed"
        >
          {t('subheadline')}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href={`/${locale}/scans/new`}>
            <motion.button 
              {...buttonInteraction}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {bt('startNow')} <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
            </motion.button>
          </Link>
          <Link href="#how-it-works">
            <motion.button 
              {...buttonInteraction}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" className={isRtl ? "rotate-180" : ""} /> {bt('viewHow')}
            </motion.button>
          </Link>
        </motion.div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center justify-center gap-2 font-bold text-gray-400"><Shield size={24} /> ISO 27001</div>
          <div className="flex items-center justify-center gap-2 font-bold text-gray-400"><Lock size={24} /> SOC2 Type II</div>
          <div className="flex items-center justify-center gap-2 font-bold text-gray-400"><Server size={24} /> GDPR Ready</div>
          <div className="flex items-center justify-center gap-2 font-bold text-gray-400"><CheckCircle2 size={24} /> OWASP Compliance</div>
        </div>
      </Container>
    </Section>
  )
}

export function Features() {
  const t = useTranslations('landing.features')
  
  return (
    <Section id="features" className="bg-gray-50/50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('title')}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{t('subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Search}
            title={t('discovery.title')}
            description={t('discovery.desc')}
          />
          <FeatureCard 
            icon={Zap}
            title={t('analysis.title')}
            description={t('analysis.desc')}
          />
          <FeatureCard 
            icon={Cpu}
            title={t('distributed.title')}
            description={t('distributed.desc')}
          />
        </div>
      </Container>
    </Section>
  )
}

export function Tools() {
  const t = useTranslations('landing.tools')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const tools = [
    { name: "OWASP ZAP", desc: t('items.zap'), badge: t('integrated') },
    { name: "FFUF", desc: t('items.ffuf'), badge: t('integrated') },
    { name: "Nmap", desc: t('items.nmap'), badge: t('integrated') },
    { name: "WPScan", desc: t('items.wpscan'), badge: t('integrated') },
    { name: "SQLMap", desc: t('items.sqlmap'), badge: t('integrated') },
    { name: "Custom Engines", desc: t('items.custom'), badge: t('comingSoon') },
  ]

  return (
    <Section id="tools">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('title')}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{t('subtitle')}</p>
          </div>
          <Link href={`/${locale}/scans/new`} className="text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
            {t('viewAll')} <ArrowRight size={18} className={isRtl ? "rotate-180" : ""} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <motion.div 
              key={tool.name} 
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">{tool.name}</h4>
                <ToolBadge>{tool.badge}</ToolBadge>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{tool.desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

