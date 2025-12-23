'use client';

import * as React from "react"
import { ShieldCheck, Activity, BarChart3, Fingerprint, Lock, ShieldAlert, Coins } from "lucide-react"
import { Container, Section } from "./ui"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"

export function HowItWorks() {
  const t = useTranslations('landing.howItWorks')
  const steps = [
    { icon: Fingerprint, title: t('step1.title'), desc: t('step1.desc') },
    { icon: Lock, title: t('step2.title'), desc: t('step2.desc') },
    { icon: Activity, title: t('step3.title'), desc: t('step3.desc') },
    { icon: BarChart3, title: t('step4.title'), desc: t('step4.desc') },
  ]

  return (
    <Section id="how-it-works" className="bg-gray-900 text-white overflow-hidden relative">
      <Container className="relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('title')}</h2>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <step.icon size={32} />
                </div>
                <h4 className="text-xl font-bold mb-4">0{idx + 1}. {step.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export function AuthHighlight() {
  const t = useTranslations('landing.auth')
  
  return (
    <Section>
      <Container>
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {t('title')}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {t('subtitle')}
            </p>
            <ul className="space-y-4">
              {[0, 1, 2, 3].map((idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-700 font-medium">
                  <ShieldCheck size={20} className="text-green-500" /> {t(`items.${idx}`)}
                </li>
              ))}
            </ul>
          </div>
          <motion.div 
            initial={{ rotateY: 20, opacity: 0 }}
            whileInView={{ rotateY: 0, opacity: 1 }}
            className="relative"
          >
            <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800 font-mono text-xs text-blue-400 leading-relaxed">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <p className="text-gray-500"># Payload Configuration</p>
              <p>&#123;</p>
              <p className="pl-4">"target_config": &#123;</p>
              <p className="pl-8">"authentication": &#123;</p>
              <p className="pl-12 text-blue-300">"token": "eyJhGciOiJIUzI1NiI...",</p>
              <p className="pl-12 text-blue-300">"cookies": [ &#123 "name": "session", "value": "abc" &#125; ]</p>
              <p className="pl-8">&#125;,</p>
              <p className="pl-8">"headers": &#123; "X-Scan-Origin": "Platform" &#125;</p>
              <p className="pl-4">&#125;</p>
              <p>&#125;</p>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  )
}

export function TrustSection() {
  const t = useTranslations('landing.trust')
  
  return (
    <Section className="bg-gray-50">
      <Container>
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">{t('title')}</h2>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-white p-8 rounded-2xl border border-orange-100 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3 text-orange-600">
                <ShieldAlert size={24} />
                <h4 className="font-bold text-lg">{t('captcha.title')}</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{t('captcha.desc')}</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-3 text-blue-600">
                <Coins size={24} />
                <h4 className="font-bold text-lg">{t('credits.title')}</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{t('credits.desc')}</p>
            </motion.div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

