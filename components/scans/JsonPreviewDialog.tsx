'use client';

import * as React from "react"
import { X, Copy, Check } from "lucide-react"
import { Button } from "./ui"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

interface JsonPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  payload: any
}

export function JsonPreviewDialog({ isOpen, onClose, payload }: JsonPreviewDialogProps) {
  const [copied, setCopied] = React.useState(false)
  const t = useTranslations('common.buttons')

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative flex max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/12 bg-[rgba(8,16,30,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Payload Preview</h3>
                <p className="text-sm text-text-muted">The exact JSON structure sent to our scanning engine.</p>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-[#0B0E14] p-6">
              <pre className="font-mono text-sm leading-relaxed text-cyan-200">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 bg-white/5 p-4">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? t('copied') : t('copy')}
              </Button>
              <Button onClick={onClose} size="sm">{t('close')}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


