import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Share2, Users, Calendar, Shield, Trash2, Key, Loader2, AlertTriangle, Check, X, User, Mail, Globe } from 'lucide-react'
import DashboardShell from '../../components/dashboard/DashboardShell'
import Card from '../../components/ui/Card'
import { AuthContext } from '../../context/AuthContext'
import api from '../../lib/api'
import { changePassword, deleteAccount } from '../../services/authService'

function SettingsToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(onDismiss, 3500)
    return () => window.clearTimeout(id)
  }, [toast, onDismiss])

  if (!toast) return null
  const isSuccess = toast.type === 'success'

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-modalIn">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isSuccess ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
        }`}>
          {isSuccess ? <Check size={16} /> : <X size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {isSuccess ? 'Success' : 'Error'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>
        </div>
      </div>
    </div>
  )
}

function StatSkeleton() {
  return (
    <Card className="p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-4 h-10 w-20 rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="mt-2 h-4 w-32 rounded-md bg-slate-100 dark:bg-slate-800" />
    </Card>
  )
}

function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape' && !isDeleting) onClose() }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isDeleting])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      style={{ background: 'rgba(2, 6, 23, 0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-modalIn">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white">
          Delete Account?
        </h3>
        <p className="mt-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          Are you sure you want to permanently delete your account?
        </p>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          This action cannot be undone.
        </p>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Deleting your account will permanently remove your account, all forms, all responses, all analytics, and all uploaded files.
        </p>
        
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)
  
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatsLoading(true)
    api.get('/v1/dashboard/stats')
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch(() => { if (!cancelled) setStats({ totalForms: 0, publishedForms: 0, totalResponses: 0, created_at: new Date().toISOString() }) })
      .finally(() => { if (!cancelled) setStatsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'New passwords do not match' })
      return
    }
    
    if (newPassword.length < 8) {
      setToast({ type: 'error', message: 'Password must be at least 8 characters' })
      return
    }

    try {
      setIsChangingPassword(true)
      await changePassword(currentPassword, newPassword)
      setToast({ type: 'success', message: 'Password updated successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.detail || 'Failed to update password' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true)
      await deleteAccount()
      logout()
      navigate('/login')
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.detail || 'Failed to delete account' })
      setIsDeletingAccount(false)
    }
  }

  const formatDate = (isoString) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(isoString))
  }

  return (
    <DashboardShell
      title="Settings"
      subtitle="Manage your account preferences and security."
    >
      <div className="space-y-8 animate-fadeIn pb-20 lg:pb-24">
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statsLoading || !stats ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Total Forms</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <FileText size={18} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stats.totalForms.toLocaleString()}
                    </h3>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Total Responses</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stats.totalResponses.toLocaleString()}
                    </h3>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Active Forms</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <Share2 size={18} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stats.publishedForms.toLocaleString()}
                    </h3>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Member Since</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <Calendar size={18} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {formatDate(stats.created_at)}
                    </h3>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Published Forms</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                      <Globe size={18} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {stats.publishedForms.toLocaleString()}
                    </h3>
                  </div>
                </Card>
              </>
            )}
          </div>
        </section>

        {/* 2-column grid: Left = Profile Info + Danger Zone, Right = Security */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {/* LEFT column */}
          <div className="flex flex-col gap-6">
            {/* Profile Information */}
            <section>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <User size={18} className="text-brand-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Full Name */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <User size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Full Name</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.name || user?.full_name || '—'}
                  </p>
                </div>
              </div>
              {/* Email */}
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                  <Mail size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">Email Address</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.email || '—'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
            </section>

            {/* Danger Zone */}
            <section>
              <Card className="overflow-hidden border-red-200 dark:border-red-900/50">
                <div className="border-b border-red-100 bg-red-50/50 px-6 py-4 dark:border-red-900/20 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                    <AlertTriangle size={18} />
                    <h2 className="text-lg font-bold">Danger Zone</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Delete Account</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Permanently remove your account and all associated data. This action is not reversible.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* RIGHT column: Security */}
          <section className="flex flex-col h-full">
          <Card className="overflow-hidden flex flex-col h-full">
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-slate-500 dark:text-slate-400" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Security</h2>
              </div>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Key size={16} className="mr-2" />
                    )}
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    disabled={isChangingPassword || (!currentPassword && !newPassword && !confirmPassword)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </Card>
          </section>
        </div>

      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeletingAccount}
      />
      
      <SettingsToast toast={toast} onDismiss={() => setToast(null)} />
    </DashboardShell>
  )
}
