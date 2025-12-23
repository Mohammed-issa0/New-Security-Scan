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
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payload Preview</h3>
                <p className="text-sm text-gray-500">The exact JSON structure sent to our scanning engine.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-[#0B0E14]">
              <pre className="text-blue-400 font-mono text-sm leading-relaxed">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
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

