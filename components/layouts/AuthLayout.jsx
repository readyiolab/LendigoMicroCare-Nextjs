import React from 'react';
import { Shield, CheckCircle2, Lock, Smartphone } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      {/* Left Side: Brand & Promo */}
      <div className="hidden md:flex w-full md:w-1/2 bg-[#0A0A0B] relative overflow-hidden flex flex-col items-center justify-center p-8 md:p-16 text-white border-r border-white/5 bg-cover bg-center" style={{ backgroundImage: "url('/images/customer_login_bg.png')" }}>
        {/* Dark overlay for readability over the image */}
        <div className="absolute inset-0 bg-black/70" />
        {/* Modern Animated Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.03)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 max-w-lg flex flex-col items-center">
            {/* Minimal Logo/Icon */}
            <div className="mb-10 relative group">
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-white/10 to-white/5 rounded-lg backdrop-blur-xl border border-white/10 shadow-2xl">
                    <Shield className="w-12 h-12 text-white" strokeWidth={1.5} />
                </div>
            </div>

            <div className="text-center space-y-4 mb-16">
                <h2 className="text-5xl font-black tracking-tight text-white inline-block">
                    Lendigo <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Microcare</span>
                </h2>
                <p className="text-neutral-400 text-lg leading-relaxed max-w-sm mx-auto font-light">
                    Elevating your financial wellbeing with seamless, next-gen lending solutions.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                 {[
                    { icon: CheckCircle2, text: "Instant approval in minutes", color: "text-emerald-400" },
                    { icon: Lock, text: "Military-grade data encryption", color: "text-blue-400" },
                    { icon: Smartphone, text: "Entirely digital journey", color: "text-purple-400" }
                 ].map((item, i) => (
                    <div key={i} className="group flex items-center gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
                        <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-neutral-300 text-sm font-medium tracking-wide">{item.text}</span>
                    </div>
                 ))}
            </div>
            
             <div className="mt-16 flex items-center gap-3">
                <div className="flex -space-x-2">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-neutral-800 flex items-center justify-center text-[10px] font-bold">
                            {String.fromCharCode(64 + i)}
                        </div>
                    ))}
                </div>
                <div className="text-xs text-neutral-500 font-medium text-center">
                    Trusted by <span className="text-white">50,000+</span> professionals
                </div>
             </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative bg-white">
          <div className="w-full max-w-[400px] space-y-8">
              {/* Header */}
              <div className="text-center md:text-left space-y-2">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title || "Welcome"}</h1>
                  {subtitle && <p className="text-gray-500 text-base">{subtitle}</p>}
              </div>

              {/* Form Content */}
              <div className="bg-white">
                  {children}
              </div>

               {/* Footer */}
              <div className="pt-8 mt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="w-3 h-3" />
                  <span>Secure 256-bit SSL Encrypted</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AuthLayout;
