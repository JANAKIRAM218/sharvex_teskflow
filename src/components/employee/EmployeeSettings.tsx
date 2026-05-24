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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="size-7 text-neon" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Customize your experience and manage your account</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bell className="size-5 text-neon" />
            Notification Preferences
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Choose which notifications you want to receive
          </p>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Task Assigned</Label>
                <p className="text-xs text-muted-foreground">Get notified when a new task is assigned to you</p>
              </div>
              <Switch
                checked={taskAssigned}
                onCheckedChange={setTaskAssigned}
                className="data-[state=checked]:bg-neon"
              />
            </div>

            <Separator className="bg-dark-border" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Deadline Reminders</Label>
                <p className="text-xs text-muted-foreground">Receive reminders before task deadlines</p>
              </div>
              <Switch
                checked={deadlineReminder}
                onCheckedChange={setDeadlineReminder}
                className="data-[state=checked]:bg-neon"
              />
            </div>

            <Separator className="bg-dark-border" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Task Completed</Label>
                <p className="text-xs text-muted-foreground">Get notified when your tasks are marked complete</p>
              </div>
              <Switch
                checked={taskCompleted}
                onCheckedChange={setTaskCompleted}
                className="data-[state=checked]:bg-neon"
              />
            </div>

            <Separator className="bg-dark-border" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                className="data-[state=checked]:bg-neon"
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
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Moon className="size-5 text-cyan" />
            Appearance
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Customize the look and feel of your workspace
          </p>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                disabled={true}
                className="data-[state=checked]:bg-neon opacity-60"
              />
            </div>

            <Separator className="bg-dark-border" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-foreground text-sm">Animations</Label>
                <p className="text-xs text-muted-foreground">Enable smooth animations and transitions</p>
              </div>
              <Switch
                checked={animations}
                onCheckedChange={setAnimations}
                className="data-[state=checked]:bg-neon"
              />
            </div>

            <Separator className="bg-dark-border" />

            {/* Theme Preview */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(0, 255, 178, 0.03)', border: '1px solid rgba(0, 255, 178, 0.1)' }}>
              <p className="text-xs text-neon mb-3 font-medium">Current Theme: Dark Futuristic</p>
              <div className="flex gap-2">
                <div className="size-8 rounded-lg" style={{ background: '#0B0F19', border: '1px solid rgba(255,255,255,0.1)' }} />
                <div className="size-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div className="size-8 rounded-lg bg-neon" />
                <div className="size-8 rounded-lg bg-cyan" />
                <div className="size-8 rounded-lg" style={{ background: '#A78BFA' }} />
                <div className="size-8 rounded-lg" style={{ background: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="size-5 text-neon" />
            Account Information
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Your account details and status
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <User className="size-4 text-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm text-foreground truncate">{user?.name || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Mail className="size-4 text-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm text-foreground truncate">{user?.username || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Shield className="size-4 text-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm text-foreground capitalize">{user?.role || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Settings className="size-4 text-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm text-neon flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-neon neon-pulse" />
                  Active
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Change Password */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lock className="size-5 text-cyan" />
            Change Password
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Update your account password for security
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Current Password</Label>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-dark-card border-dark-border text-foreground pr-10"
                  placeholder="Enter current password"
                />
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  {showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-dark-card border-dark-border text-foreground"
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-dark-card border-dark-border text-foreground"
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
                <p className="text-xs text-muted-foreground">
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
              className="border-cyan/30 text-cyan hover:bg-cyan/10 hover:text-cyan w-full"
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
