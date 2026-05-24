'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Building2,
  BadgeCheck,
  Calendar,
  TrendingUp,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function Profile() {
  const { user, token, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [employeeData, setEmployeeData] = useState<{
    joiningDate: string;
    assignedTasks: { id: string; status: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployeeData = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/employees/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeData(data.employee);
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !e.target.files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('taskId', 'profile');
      formData.append('uploadedBy', user?.id || '');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        setProfileImage(uploadData.url);
        toast.success('Profile image uploaded!');
      } else {
        toast.error('Failed to upload image');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!token || !user?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName,
          designation,
          profileImage,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({
          name: data.employee.fullName,
          designation: data.employee.designation,
          profileImage: data.employee.profileImage,
        });
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
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
      // Using the employees endpoint for password change
      const res = await fetch(`/api/employees/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
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

  const completedTasks = employeeData?.assignedTasks?.filter((t) => t.status === 'completed').length || 0;
  const totalTasks = employeeData?.assignedTasks?.length || 0;

  const stats = [
    {
      label: 'Tasks Completed',
      value: completedTasks,
      icon: TrendingUp,
      color: '#00FFB2',
    },
    {
      label: 'Performance Score',
      value: `${user?.performanceScore || 0}%`,
      icon: BadgeCheck,
      color: '#00E5FF',
    },
    {
      label: 'Total Tasks',
      value: totalTasks,
      icon: Calendar,
      color: '#A78BFA',
    },
    {
      label: 'Joining Date',
      value: employeeData?.joiningDate
        ? new Date(employeeData.joiningDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'N/A',
      icon: Calendar,
      color: '#F59E0B',
    },
  ];

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
          <User className="size-7 text-neon" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and settings</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            {/* Avatar with upload */}
            <div className="relative group mb-4">
              <Avatar className="size-24 border-2 border-neon/30">
                <AvatarImage src={profileImage} alt={user?.name} />
                <AvatarFallback className="bg-neon/10 text-neon text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 size-24 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <span className="size-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="size-6 text-neon" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <h2 className="text-lg font-bold text-foreground">{user?.name}</h2>
            <p className="text-sm text-neon mt-1">{user?.designation || 'Employee'}</p>

            <Separator className="my-4 bg-dark-border" />

            <div className="space-y-3 w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheck className="size-4 text-cyan shrink-0" />
                <span>Code: {user?.employeeCode || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="size-4 text-cyan shrink-0" />
                <span>{user?.department || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 text-cyan shrink-0" />
                <span>{user?.username || '-'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit Profile + Stats */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <stat.icon className="size-5 mx-auto mb-2" style={{ color: stat.color }} />
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Edit Profile Form */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="size-5 text-neon" />
              Edit Profile
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Full Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-dark-card border-dark-border text-foreground"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Designation</Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="bg-dark-card border-dark-border text-foreground"
                    placeholder="Enter your designation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Department</Label>
                  <Input
                    value={user?.department || ''}
                    disabled
                    className="bg-dark-card border-dark-border text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Employee Code</Label>
                  <Input
                    value={user?.employeeCode || ''}
                    disabled
                    className="bg-dark-card border-dark-border text-muted-foreground"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="glow-button w-full sm:w-auto"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="size-4" /> Save Changes
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lock className="size-5 text-cyan" />
              Change Password
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-dark-card border-dark-border text-foreground pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label className="text-muted-foreground text-xs">Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-dark-card border-dark-border text-foreground"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                variant="outline"
                className="border-cyan/30 text-cyan hover:bg-cyan/10 hover:text-cyan"
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
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
