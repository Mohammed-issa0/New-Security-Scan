'use client';

import * as React from "react"
import { X, Copy, Check, PlayCircle } from "lucide-react"
import { Button } from "./ui"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

interface JsonPreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  payload: unknown
  onApply?: (parsed: unknown) => boolean
}

export function JsonPreviewDialog({ isOpen, onClose, payload, onApply }: JsonPreviewDialogProps) {
  const [copied, setCopied] = React.useState(false)
  const [editedText, setEditedText] = React.useState('')
  const [parseError, setParseError] = React.useState<string | null>(null)
  const tButtons = useTranslations('common.buttons')
  const t = useTranslations('scanForm.jsonPreview')

  const jsonText = React.useMemo(
    () => JSON.stringify(payload ?? {}, null, 2),
    [payload]
  )

  React.useEffect(() => {
    if (isOpen) {
      setEditedText(jsonText)
      setParseError(null)
    }
    // Only reset the editable draft when the dialog opens, or when the
    // underlying payload actually changes while nothing has been typed yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, jsonText])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applyEditedJson = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(editedText)
    } catch {
      setParseError(t('invalidJson'))
      return
    }

    const applied = onApply?.(parsed) ?? false
    if (applied) {
      setParseError(null)
      onClose()
    } else {
      setParseError(t('invalidJson'))
    }
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
            className="relative flex flex-col max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/12 bg-[rgba(8,16,30,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{t('title')}</h3>
                <p className="mt-1 text-sm font-medium text-cyan-300/90">{t('forDevelopers')}</p>
                <p className="mt-1 text-sm text-text-muted">{t('description')}</p>
                {onApply && <p className="mt-1 text-xs text-text-muted">{t('editableHint')}</p>}
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-cyber-bg p-6">
              {onApply ? (
                <textarea
                  value={editedText}
                  onChange={(event) => {
                    setEditedText(event.target.value)
                    if (parseError) setParseError(null)
                  }}
                  spellCheck={false}
                  className="h-full min-h-[300px] w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-cyan-200 outline-none"
                />
              ) : (
                <pre className="font-mono text-sm leading-relaxed text-cyan-200">
                  {jsonText}
                </pre>
              )}
              {parseError && (
                <p className="mt-3 text-sm text-status-danger">{parseError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 bg-white/5 p-4">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
                {copied ? tButtons('copied') : tButtons('copy')}
              </Button>
              {onApply && (
                <Button size="sm" onClick={applyEditedJson} className="gap-2">
                  <PlayCircle size={14} />
                  {tButtons('apply')}
                </Button>
              )}
              <Button variant="outline" onClick={onClose} size="sm">{tButtons('close')}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
