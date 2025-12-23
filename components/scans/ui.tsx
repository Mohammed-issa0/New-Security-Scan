'use client';

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};

export const buttonInteraction = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
      ghost: "hover:bg-gray-100 text-gray-600",
      danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    }
    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-5 text-base",
      lg: "h-13 px-8 text-lg",
      icon: "h-9 w-9",
    }
    
    return (
      <motion.button
        {...buttonInteraction}
        ref={ref as any}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props as any}
      />
    )
  }
)
Button.displayName = "Button"

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
)

export const CardHeader = ({ title, description, icon: Icon, children }: { title: string, description?: string, icon?: LucideIcon, children?: React.ReactNode }) => (
  <div className="p-6 border-b border-gray-50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Icon size={20} /></div>}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  </div>
)

export const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

export const Label = ({ children, className = "", required, htmlFor }: { children: React.ReactNode, className?: string, required?: boolean, htmlFor?: string }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-semibold text-gray-700 mb-1.5 ${className}`}>
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-2 text-sm ring-offset-white transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-2 text-sm ring-offset-white transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`flex h-11 w-full rounded-lg border border-gray-200 bg-gray-50/30 px-3 py-2 text-sm ring-offset-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 rtl:bg-[left_0.5rem_center] rtl:pr-3 rtl:pl-10 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = "Select"

export const Badge = ({ children, className = "", variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' }) => {
  const variants = {
    default: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-green-50 text-green-700 border-green-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    error: "bg-red-50 text-red-700 border-red-100",
    outline: "bg-transparent text-gray-600 border-gray-200",
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>{children}</span>
}

export const Alert = ({ children, variant = 'info', title }: { children: React.ReactNode, variant?: 'info' | 'warning' | 'error' | 'success', title?: string }) => {
  const styles = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    error: "bg-red-50 text-red-800 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200",
  }
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border ${styles[variant]} space-y-1`}
    >
      {title && <h4 className="font-bold text-sm">{title}</h4>}
      <div className="text-sm leading-relaxed">{children}</div>
    </motion.div>
  )
}

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <motion.input
      whileTap={{ scale: 0.9 }}
      type="checkbox"
      ref={ref as any}
      className={`h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all ${className}`}
      {...props as any}
    />
  )
)
Checkbox.displayName = "Checkbox"

