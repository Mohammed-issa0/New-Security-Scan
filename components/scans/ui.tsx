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
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-300/55 focus:ring-offset-2 focus:ring-offset-cyber-bg disabled:opacity-50 disabled:pointer-events-none"
    const variants = {
      primary: "bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 hover:shadow-[0_0_34px_rgba(0,209,255,0.26)]",
      secondary: "bg-white/8 text-text-primary border border-white/10 hover:bg-white/12",
      outline: "border border-cyan-400/26 bg-white/5 hover:bg-white/10 text-text-primary",
      ghost: "hover:bg-white/8 text-text-secondary hover:text-text-primary",
      danger: "bg-status-danger/12 text-status-danger hover:bg-status-danger/18 border border-status-danger/30",
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
    className={`rounded-2xl border border-cyan-400/14 bg-cyber-panel/75 shadow-cyber backdrop-blur-sm overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
)

export const CardHeader = ({ title, description, icon: Icon, children }: { title: string, description?: string, icon?: LucideIcon, children?: React.ReactNode }) => (
  <div className="p-6 border-b border-white/8">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/18"><Icon size={20} /></div>}
        <div>
          <h3 className="text-md font-semibold text-text-primary">{title}</h3>
          {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
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
  <label htmlFor={htmlFor} className={`block text-sm font-semibold text-text-secondary mb-1.5 ${className}`}>
    {children} {required && <span className="text-status-danger">*</span>}
  </label>
)

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`flex h-11 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary ring-offset-cyber-bg transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Input.displayName = "Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`flex min-h-[80px] w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary ring-offset-cyber-bg transition-all placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`flex h-11 w-full rounded-lg border border-cyan-400/18 bg-white/5 px-3 py-2 text-sm text-text-primary ring-offset-cyber-bg transition-all focus:outline-none focus:ring-2 focus:ring-cyan-300/45 focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-50 appearance-none [color-scheme:dark] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%239fb3c8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 rtl:bg-[left_0.5rem_center] rtl:pr-3 rtl:pl-10 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = "Select"

export const Badge = ({ children, className = "", variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'warning' | 'error' | 'outline' }) => {
  const variants = {
    default: "bg-cyan-400/12 text-cyan-200 border-cyan-300/25",
    success: "bg-status-success/12 text-status-success border-status-success/25",
    warning: "bg-status-warning/14 text-status-warning border-status-warning/30",
    error: "bg-status-danger/14 text-status-danger border-status-danger/28",
    outline: "bg-transparent text-text-secondary border-white/14",
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>{children}</span>
}

export const Alert = ({ children, variant = 'info', title }: { children?: React.ReactNode, variant?: 'info' | 'warning' | 'error' | 'success', title?: string }) => {
  const styles = {
    info: "bg-cyan-400/10 text-cyan-100 border-cyan-300/28",
    warning: "bg-status-warning/14 text-status-warning border-status-warning/30",
    error: "bg-status-danger/14 text-status-danger border-status-danger/30",
    success: "bg-status-success/12 text-status-success border-status-success/28",
  }
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border ${styles[variant]} space-y-1`}
    >
      {title && <h4 className="font-bold text-sm">{title}</h4>}
      {children && <div className="text-sm leading-relaxed">{children}</div>}
    </motion.div>
  )
}

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <motion.input
      whileTap={{ scale: 0.9 }}
      type="checkbox"
      ref={ref as any}
      className={`h-5 w-5 rounded border-cyan-400/35 bg-white/5 text-cyan-300 focus:ring-cyan-300/45 transition-all ${className}`}
      {...props as any}
    />
  )
)
Checkbox.displayName = "Checkbox"

