import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import GuestRoute from '@/components/auth/GuestRoute'
import Landing from '@/pages/Landing'
// Auth
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import GoogleCallback from '@/pages/GoogleCallback'
// NyayMitra
import NyayDashboard from '@/pages/nyaymitra/Dashboard'
import FileComplaint from '@/pages/nyaymitra/FileComplaint'
import Cases from '@/pages/nyaymitra/Cases'
import CaseDetail from '@/pages/nyaymitra/CaseDetail'
import LegalChat from '@/pages/nyaymitra/LegalChat'
import LegalDesk from '@/pages/nyaymitra/LegalDesk'
import FormAutoFill from '@/pages/nyaymitra/FormAutoFill'
// PanchayatGPT
import PanchayatDashboard from '@/pages/panchayat/Dashboard'
import SchemeSearch from '@/pages/panchayat/SchemeSearch'
import BudgetAllocation from '@/pages/panchayat/BudgetAllocation'
import MeetingMinutes from '@/pages/panchayat/MeetingMinutes'
import Grievances from '@/pages/panchayat/Grievances'
// Admin
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'font-sans text-sm',
              style: { borderRadius: '0.5rem', border: '1px solid hsl(var(--border))' },
            }}
          />
          <Routes>
            <Route element={<MainLayout />}>
              {/* Public */}
              <Route path="/" element={<Landing />} />

              {/* Auth — redirect to dashboard if already logged in */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />

              {/* NyayMitra — protected */}
              <Route path="/nyaymitra" element={<ProtectedRoute><NyayDashboard /></ProtectedRoute>} />
              <Route path="/nyaymitra/file" element={<ProtectedRoute><FileComplaint /></ProtectedRoute>} />
              <Route path="/nyaymitra/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
              <Route path="/nyaymitra/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
              <Route path="/nyaymitra/chat" element={<ProtectedRoute><LegalChat /></ProtectedRoute>} />
              <Route path="/nyaymitra/desk" element={<ProtectedRoute><LegalDesk /></ProtectedRoute>} />
              <Route path="/nyaymitra/forms" element={<ProtectedRoute><FormAutoFill /></ProtectedRoute>} />

              {/* PanchayatGPT — protected */}
              <Route path="/panchayat" element={<ProtectedRoute><PanchayatDashboard /></ProtectedRoute>} />
              <Route path="/panchayat/schemes" element={<ProtectedRoute><SchemeSearch /></ProtectedRoute>} />
              <Route path="/panchayat/budget" element={<ProtectedRoute><BudgetAllocation /></ProtectedRoute>} />
              <Route path="/panchayat/meetings" element={<ProtectedRoute><MeetingMinutes /></ProtectedRoute>} />
              <Route path="/panchayat/grievances" element={<ProtectedRoute><Grievances /></ProtectedRoute>} />

              {/* Admin — protected, role-restricted */}
              <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
