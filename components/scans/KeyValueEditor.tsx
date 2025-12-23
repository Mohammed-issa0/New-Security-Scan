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
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
          {tooltip && (
            <div className="group relative">
              <Info size={14} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
          className="h-8 gap-1.5 text-xs font-bold border-blue-100 text-blue-600 hover:bg-blue-50"
        >
          <Plus size={14} /> {t('copy') === 'نسخ البيانات' ? 'إضافة' : 'Add'}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {fields.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl"
          >
            <p className="text-sm text-gray-400 italic">No {title.toLowerCase()} configured yet</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <motion.div 
                key={field.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 group transition-all hover:border-gray-200"
              >
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <Input
                    {...register(`${name}.${index}.name` as any)}
                    placeholder={labelPlaceholder}
                    className="h-9 bg-white"
                  />
                  <Input
                    {...register(`${name}.${index}.value` as any)}
                    placeholder={valuePlaceholder}
                    className="h-9 bg-white"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
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

