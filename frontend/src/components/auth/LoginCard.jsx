import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useContext, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Card from '../ui/Card'
import TextField from '../ui/TextField'
import { AuthContext } from '../../context/AuthContext'

export default function LoginCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (values) => {
    setServerError('')
    setSuccessMessage('')
    try {
      await login({
        email: values.email,
        password: values.password,
      })
      setSuccessMessage(t('auth.loginSuccess'))
      navigate('/dashboard')
    } catch (error) {
      setServerError(error?.response?.data?.detail || t('messages.unexpectedError'))
    }
  }

  return (
    <Card className="p-8 border-none shadow-none dark:bg-transparent">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">{t('auth.login')}</p>
        <h2 className="mt-3 text-3xl font-semibold">{t('auth.accessDashboard')}</h2>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label={t('auth.email')}
          type="email"
          placeholder="admin@formflow.app"
          error={errors.email?.message}
          {...register('email', {
            required: t('auth.emailRequired'),
            pattern: { value: /^\S+@\S+\.\S+$/, message: t('auth.invalidEmail') },
          })}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('auth.password')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950"
              {...register('password', {
                required: t('auth.passwordRequired'),
                minLength: { value: 8, message: t('auth.passwordMinLength') },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password?.message && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="rounded border-slate-300 text-brand-500 focus:ring-brand-500" />
            {t('common.rememberMe')}
          </label>
          <a href="#" className="font-medium text-brand-500 hover:text-brand-600">
            {t('common.forgotPassword')}
          </a>
        </div>

        {serverError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</p>}
        {successMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{successMessage}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle size={18} className="mr-2 animate-spin" />
              {t('common.signingIn')}
            </>
          ) : (
            t('auth.signIn')
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        {t('auth.newHere')}{' '}
        <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
          {t('auth.createAccountBtn')}
        </Link>
      </p>
    </Card>
  )
}
