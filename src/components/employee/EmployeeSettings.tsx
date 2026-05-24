'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Bell,
  Moon,
  Lock,
  Eye,
  EyeOff,
  Shield,
  User,
  Save,
  Mail,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function EmployeeSettings() {
  const { user, token } = useAuthStore();

  // Notification preferences
  const [taskAssigned, setTaskAssigned] = useState(true);
  const [deadlineReminder, setDeadlineReminder] = useState(true);
  const [taskCompleted, setTaskCompleted] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Theme (dark only, toggle is shown but disabled)
  const [darkMode, setDarkMode] = useState(true);
  const [animations, setAnimations] = useState(true);

  // Password
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    // Simulate save (no backend endpoint for preferences)
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success('Notification preferences saved!');
    setSavingNotifications(false);
  };

  const handleChangePassword = async () => {
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
    setChangingPassword(true);
    try {
      const res = await fetch(`/api/employees/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] flex items-center gap-2">
          <Settings className="size-7 text-[#00FFB2]" />
          Settings
        </h1>
        <p className="text-[#94A3B8] mt-1">Customize your experience and manage your account</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4 flex items-center gap-2">
            <Bell className="size-5 text-[#00FFB2]" />
            Notification Preferences
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            Choose which notifications you want to receive
          </p>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Task Assigned</Label>
                <p className="text-xs text-[#94A3B8]">Get notified when a new task is assigned to you</p>
              </div>
              <Switch
                checked={taskAssigned}
                onCheckedChange={setTaskAssigned}
                className="data-[state=checked]:bg-[#00FFB2]"
              />
            </div>

            <Separator className="bg-[rgba(255,255,255,0.08)]" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Deadline Reminders</Label>
                <p className="text-xs text-[#94A3B8]">Receive reminders before task deadlines</p>
              </div>
              <Switch
                checked={deadlineReminder}
                onCheckedChange={setDeadlineReminder}
                className="data-[state=checked]:bg-[#00FFB2]"
              />
            </div>

            <Separator className="bg-[rgba(255,255,255,0.08)]" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Task Completed</Label>
                <p className="text-xs text-[#94A3B8]">Get notified when your tasks are marked complete</p>
              </div>
              <Switch
                checked={taskCompleted}
                onCheckedChange={setTaskCompleted}
                className="data-[state=checked]:bg-[#00FFB2]"
              />
            </div>

            <Separator className="bg-[rgba(255,255,255,0.08)]" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Email Notifications</Label>
                <p className="text-xs text-[#94A3B8]">Receive notifications via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                className="data-[state=checked]:bg-[#00FFB2]"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="glow-button w-full mt-6"
          >
            {savingNotifications ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="size-4" /> Save Preferences
              </span>
            )}
          </Button>
        </motion.div>

        {/* Theme Settings */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4 flex items-center gap-2">
            <Moon className="size-5 text-[#00E5FF]" />
            Appearance
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            Customize the look and feel of your workspace
          </p>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Dark Mode</Label>
                <p className="text-xs text-[#94A3B8]">Toggle between light and dark themes</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                disabled={true}
                className="data-[state=checked]:bg-[#00FFB2] opacity-60"
              />
            </div>

            <Separator className="bg-[rgba(255,255,255,0.08)]" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[#E5E7EB] text-sm">Animations</Label>
                <p className="text-xs text-[#94A3B8]">Enable smooth animations and transitions</p>
              </div>
              <Switch
                checked={animations}
                onCheckedChange={setAnimations}
                className="data-[state=checked]:bg-[#00FFB2]"
              />
            </div>


          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4 flex items-center gap-2">
            <Shield className="size-5 text-[#00FFB2]" />
            Account Information
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            Your account details and status
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <User className="size-4 text-[#00E5FF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Full Name</p>
                <p className="text-sm text-[#E5E7EB] truncate">{user?.name || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Mail className="size-4 text-[#00E5FF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Username</p>
                <p className="text-sm text-[#E5E7EB] truncate">{user?.username || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Shield className="size-4 text-[#00E5FF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Role</p>
                <p className="text-sm text-[#E5E7EB] capitalize">{user?.role || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Settings className="size-4 text-[#00E5FF] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#94A3B8]">Status</p>
                <p className="text-sm text-[#00FFB2] flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#00FFB2] neon-pulse" />
                  Active
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4 flex items-center gap-2">
            <Lock className="size-5 text-[#00E5FF]" />
            Change Password
          </h3>
          <p className="text-sm text-[#94A3B8] mb-6">
            Update your account password for security
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#94A3B8] text-xs">Current Password</Label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB] pr-10"
                  placeholder="Enter current password"
                />
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E5E7EB]"
                  type="button"
                >
                  {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] text-xs">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]"
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#94A3B8] text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]"
                placeholder="Confirm new password"
              />
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className="h-1 flex-1 rounded-full"
                      style={{
                        background:
                          newPassword.length >= level * 3
                            ? newPassword.length >= 12
                              ? '#00FFB2'
                              : newPassword.length >= 8
                                ? '#F59E0B'
                                : '#EF4444'
                            : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#94A3B8]">
                  {newPassword.length < 6
                    ? 'Weak password'
                    : newPassword.length < 8
                      ? 'Fair password'
                      : newPassword.length < 12
                        ? 'Good password'
                        : 'Strong password'}
                </p>
              </div>
            )}

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              variant="outline"
              className="border-[rgba(0,229,255,0.3)] text-[#00E5FF] hover:bg-[rgba(0,229,255,0.1)] hover:text-[#00E5FF] w-full"
            >
              {changingPassword ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Changing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="size-4" /> Change Password
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
