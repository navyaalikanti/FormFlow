import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/Landing/LandingPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import FormsPage from './pages/Dashboard/FormsPage'
import FormBuilderPage from './pages/Builder/FormBuilderPage'
import ResponsesPage from './pages/Dashboard/ResponsesPage'
import SettingsPage from './pages/Dashboard/SettingsPage'
import AuditLogsPage from './pages/Dashboard/AuditLogsPage'
import PublicFormPage from './pages/PublicForm/PublicFormPage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />
      <Route path="/register" element={<LandingPage />} />
      
      {/* Public form viewer – no authentication required */}
      <Route path="/f/:token" element={<PublicFormPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/forms"
        element={
          <ProtectedRoute>
            <FormsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/forms/:formId/build"
        element={
          <ProtectedRoute>
            <FormBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/responses"
        element={
          <ProtectedRoute>
            <ResponsesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/audit-logs"
        element={
          <ProtectedRoute>
            <AuditLogsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
