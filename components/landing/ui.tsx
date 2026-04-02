import * as React from "react"
import { Shield, Target, Lock, Zap, Server, Code, CheckCircle2, ArrowRight, Menu, X, Coins, ShieldCheck, Cpu, Terminal, Search, Globe, Fingerprint, Layers, Activity } from "lucide-react"

export const Container = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
)

export const Section = ({ children, className = "", id = "" }: { children: React.ReactNode, className?: string, id?: string }) => (
  <section id={id} className={`relative py-20 md:py-32 ${className}`}>{children}</section>
)

export const GradientText = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-400 ${className}`}>
    {children}
  </span>
)

export const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="cyber-card cyber-card-hover p-8 rounded-3xl group">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-cyan-300 mb-6 bg-cyan-400/10 border border-cyan-400/15 shadow-glow group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold text-text-primary mb-3">{title}</h3>
    <p className="text-text-secondary leading-relaxed text-sm">{description}</p>
  </div>
)

export const ToolBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">
    {children}
  </span>
)

export const GlassButton = ({ children, className = "", tone = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' | 'danger' }) => {
  const tones = {
    primary: 'bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-slate-950 shadow-glow hover:shadow-[0_0_38px_rgba(0,209,255,0.34)]',
    secondary: 'border border-cyan-400/30 bg-white/5 text-text-primary hover:bg-white/8',
    danger: 'bg-status-danger/10 border border-status-danger/20 text-status-danger hover:bg-status-danger/15',
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}



