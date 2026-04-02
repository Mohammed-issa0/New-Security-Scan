'use client';

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Play, CheckCircle2, Shield, Search, Zap, Cpu, Server, Lock } from "lucide-react"
import { Container, Section, GradientText, FeatureCard, ToolBadge } from "./ui"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { buttonInteraction } from "../scans/ui"
import { sectionReveal, sectionStagger } from "../motion/Transitions"

export function Hero() {
  const t = useTranslations('landing.hero')
  const bt = useTranslations('common.buttons')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <Section className="pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 mx-auto h-[42rem] w-[42rem] -translate-y-20 rounded-full bg-[radial-gradient(circle,rgba(0,209,255,0.16),transparent_68%)] blur-3xl" />
      <div className="absolute inset-0 cyber-grid opacity-[0.08]" />

      <motion.div initial="hidden" animate="show" variants={sectionStagger} className="absolute inset-0">
        <motion.div variants={sectionReveal} className="absolute left-[8%] top-[18%] h-2 w-2 rounded-full bg-cyan-300 shadow-glow" />
        <motion.div variants={sectionReveal} className="absolute right-[12%] top-[28%] h-3 w-3 rounded-full bg-blue-300 shadow-glow" />
      </motion.div>

      <Container className="text-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-200 text-xs font-bold mb-8 backdrop-blur"
        >
          <Zap size={14} fill="currentColor" /> {t('badge')}
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold text-text-primary tracking-tight mb-8 leading-[1.05]"
        >
          {t('headlinePrefix')} <br />
          <GradientText>{t('headlineGradient')}</GradientText>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-text-secondary mb-10 leading-relaxed"
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
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 rounded-full font-bold text-lg hover:shadow-[0_0_38px_rgba(0,209,255,0.3)] transition-all flex items-center justify-center gap-2"
            >
              {bt('startNow')} <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
            </motion.button>
          </Link>
          <Link href="#plans">
            <motion.button 
              {...buttonInteraction}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 text-text-primary border border-cyan-400/22 rounded-full font-bold text-lg hover:bg-white/8 transition-all flex items-center justify-center gap-2 backdrop-blur"
            >
              <Play size={18} fill="currentColor" className={isRtl ? "rotate-180" : ""} /> {bt('viewPlans')}
            </motion.button>
          </Link>
        </motion.div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { icon: Shield, label: 'ISO 27001' },
            { icon: Lock, label: 'SOC2 Type II' },
            { icon: Server, label: 'GDPR Ready' },
            { icon: CheckCircle2, label: 'OWASP Compliance' },
          ].map((item) => (
            <div key={item.label} className="cyber-card flex items-center justify-center gap-2 rounded-2xl py-4 text-text-secondary">
              <item.icon size={20} className="text-cyan-300" /> {item.label}
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function Features() {
  const t = useTranslations('landing.features')
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.1 + index * 0.1 }
    })
  }
  
  return (
    <Section id="features" className="relative">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">{t('title')}</h2>
          <p className="text-lg text-text-secondary leading-relaxed">{t('subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              custom={index}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-50px' }}
              variants={cardVariants}
            >
              <FeatureCard 
                icon={[Search, Zap, Cpu][index]}
                title={[t('discovery.title'), t('analysis.title'), t('distributed.title')][index]}
                description={[t('discovery.desc'), t('analysis.desc'), t('distributed.desc')][index]}
              />
            </motion.div>
          ))}
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
    <Section id="tools" className="relative">
      <Container>
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">{t('title')}</h2>
            <p className="text-lg text-text-secondary leading-relaxed">{t('subtitle')}</p>
          </div>
          <Link href={`/${locale}/scans/new`} className="text-cyan-300 font-bold flex items-center gap-2 hover:gap-3 transition-all">
            {t('viewAll')} <ArrowRight size={18} className={isRtl ? "rotate-180" : ""} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <motion.div 
              key={tool.name} 
              whileHover={{ y: -5 }}
              className="cyber-card cyber-card-hover p-6 rounded-2xl transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-text-primary">{tool.name}</h4>
                <ToolBadge>{tool.badge}</ToolBadge>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{tool.desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  )
}


