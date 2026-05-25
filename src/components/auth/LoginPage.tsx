'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Hash, Zap, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

type LoginTab = 'admin' | 'employee';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('admin');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Admin form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Employee form
  const [empUsername, setEmpUsername] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  const { login } = useAuthStore();
  const { setCurrentPage } = useAppStore();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      login(data.user, data.token);
      setCurrentPage('dashboard');
      toast.success('Welcome back, Admin!');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empUsername || !empCode || !empPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: empUsername, employeeCode: empCode, password: empPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }
      login(data.user, data.token);
      setCurrentPage('dashboard');
      toast.success(`Welcome, ${data.user.name || data.user.fullName || 'Employee'}!`);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Database seeded! Admin: keerthanjakkaraju@gmail.com / keerthan@sharvex');
      } else {
        toast.info(data.message || 'Database already seeded');
      }
    } catch {
      toast.error('Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(0,255,178,0.15), transparent 70%)', top: '-10%', left: '-10%' }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.15), transparent 70%)', bottom: '-10%', right: '-10%' }}
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.2), transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Brand */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Image src="/logo.png" alt="Sharvex TaskFlow" width={64} height={64} className="w-16 h-16 rounded-2xl mb-4 neon-glow" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] bg-clip-text text-transparent">
            Sharvex TaskFlow
          </h1>
          <p className="text-[#94A3B8] mt-1 text-sm">Employee Task Management Platform</p>
        </motion.div>

        {/* Glass Card */}
        <div className="glass-card p-6 sm:p-8">
          {/* Tab Switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.05)] mb-6">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] shadow-lg'
                  : 'text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
            <button
              onClick={() => setActiveTab('employee')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'employee'
                  ? 'bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] shadow-lg'
                  : 'text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <User className="w-4 h-4" />
              Employee
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'admin' ? (
              <motion.form
                key="admin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleAdminLogin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="keerthanjakkaraju@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[rgba(0,255,178,0.5)] focus:ring-2 focus:ring-[rgba(0,255,178,0.15)] transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[rgba(0,255,178,0.5)] focus:ring-2 focus:ring-[rgba(0,255,178,0.15)] transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E5E7EB] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Sign In as Admin
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="employee"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleEmployeeLogin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={empUsername}
                      onChange={(e) => setEmpUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[rgba(0,255,178,0.5)] focus:ring-2 focus:ring-[rgba(0,255,178,0.15)] transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Employee Code</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      placeholder="e.g. EMP001"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[rgba(0,255,178,0.5)] focus:ring-2 focus:ring-[rgba(0,255,178,0.15)] transition-all text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#94A3B8]">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={empPassword}
                      onChange={(e) => setEmpPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 focus:outline-none focus:border-[rgba(0,255,178,0.5)] focus:ring-2 focus:ring-[rgba(0,255,178,0.15)] transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E5E7EB] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Sign In as Employee
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Seed link */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="text-sm text-[#94A3B8] hover:text-[#00FFB2] transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            First time? Seed database
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
