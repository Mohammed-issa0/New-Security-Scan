'use client';

import * as React from "react"
import { Trash2, Plus, Info } from "lucide-react"
import { useFieldArray, Control, UseFormRegister } from "react-hook-form"
import { ScanFormSchemaType } from "@/lib/scans/schema"
import { Button, Input, Label } from "./ui"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"

interface KeyValueEditorProps {
  name: "target_config.headers" | "target_config.authentication.cookies"
  title: string
  labelPlaceholder: string
  valuePlaceholder: string
  register: UseFormRegister<ScanFormSchemaType>
  control: Control<ScanFormSchemaType>
  tooltip?: string
}

export function KeyValueEditor({
  name,
  title,
  labelPlaceholder,
  valuePlaceholder,
  register,
  control,
  tooltip
}: KeyValueEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name
  })
  
  const t = useTranslations('common.buttons')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-text-primary">{title}</h4>
          {tooltip && (
            <div className="group relative">
              <Info size={14} className="cursor-help text-text-muted" />
              <div className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded bg-slate-950 p-2 text-[10px] text-white shadow-xl opacity-0 transition-opacity pointer-events-none group-hover:opacity-100">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => append({ name: "", value: "" })}
          className="h-8 gap-1.5 text-xs font-bold border-cyan-400/20 text-cyan-300 hover:bg-white/8"
        >
          <Plus size={14} /> {t('add')}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {fields.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border-2 border-dashed border-white/10 py-6 text-center"
          >
            <p className="text-sm italic text-text-muted">No {title.toLowerCase()} configured yet</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <motion.div 
                key={field.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-white/18"
              >
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <Input
                    {...register(`${name}.${index}.name` as any)}
                    placeholder={labelPlaceholder}
                    className="h-9 bg-white/6"
                  />
                  <Input
                    {...register(`${name}.${index}.value` as any)}
                    placeholder={valuePlaceholder}
                    className="h-9 bg-white/6"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-9 w-9 shrink-0 text-text-muted hover:bg-status-danger/10 hover:text-status-danger"
                >
                  <Trash2 size={16} />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

