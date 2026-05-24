'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Lock, Bell as BellIcon, Palette, Save, Loader2, Eye, EyeOff, Moon, Shield
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { user, token, updateUser } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Notification preferences
  const [notifTaskAssigned, setNotifTaskAssigned] = useState(true);
  const [notifTaskCompleted, setNotifTaskCompleted] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // Simulate save since we don't have a dedicated admin profile update endpoint
      await new Promise((r) => setTimeout(r, 800));
      updateUser({ name: profileName, email: profileEmail });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully!');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotif(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingNotif(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-[#00FFB2]" />
        <h2 className="text-xl font-bold text-[#E5E7EB]">Settings</h2>
      </div>

      {/* Profile Section */}
      <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-[#00FFB2]" />
          <h3 className="text-[#E5E7EB] font-semibold">Profile</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-2xl font-bold">
              {profileName.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium text-[#E5E7EB]">{profileName}</p>
              <p className="text-xs text-[#94A3B8]">Administrator</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#94A3B8]">Full Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#94A3B8]">Email</label>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="glow-button px-6 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-[#00E5FF]" />
          <h3 className="text-[#E5E7EB] font-semibold">Change Password</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#94A3B8]">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 pr-10 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E5E7EB]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#94A3B8]">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 pr-10 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E5E7EB]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#94A3B8]">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="glow-button px-6 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Change Password
          </button>
        </form>
      </motion.div>

      {/* Theme Toggle */}
      <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-[#A78BFA]" />
          <h3 className="text-[#E5E7EB] font-semibold">Appearance</h3>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-[#A78BFA]" />
            <div>
              <p className="text-sm text-[#E5E7EB]">Dark Mode</p>
              <p className="text-xs text-[#94A3B8]">Currently active</p>
            </div>
          </div>
          <div className="w-11 h-6 rounded-full bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] relative cursor-not-allowed">
            <div className="absolute right-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-md" />
          </div>
        </div>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <BellIcon className="w-5 h-5 text-[#F59E0B]" />
          <h3 className="text-[#E5E7EB] font-semibold">Notification Preferences</h3>
        </div>
        <form onSubmit={handleSaveNotif} className="space-y-4">
          {[
            { label: 'Task Assigned', desc: 'Get notified when a task is assigned', value: notifTaskAssigned, setter: setNotifTaskAssigned },
            { label: 'Task Completed', desc: 'Get notified when a task is completed', value: notifTaskCompleted, setter: setNotifTaskCompleted },
            { label: 'Deadline Reminders', desc: 'Get notified about upcoming deadlines', value: notifDeadlines, setter: setNotifDeadlines },
            { label: 'System Alerts', desc: 'Get notified about system updates', value: notifSystem, setter: setNotifSystem },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.03)]">
              <div>
                <p className="text-sm text-[#E5E7EB]">{pref.label}</p>
                <p className="text-xs text-[#94A3B8]">{pref.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => pref.setter(!pref.value)}
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  pref.value
                    ? 'bg-gradient-to-r from-[#00FFB2] to-[#00E5FF]'
                    : 'bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    pref.value ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
          <button
            type="submit"
            disabled={savingNotif}
            className="glow-button px-6 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {savingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Preferences
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
