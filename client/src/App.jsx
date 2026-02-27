import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/context/ThemeContext'
import MainLayout from '@/components/layout/MainLayout'
import Landing from '@/pages/Landing'
// NyayMitra
import NyayDashboard from '@/pages/nyaymitra/Dashboard'
import FileComplaint from '@/pages/nyaymitra/FileComplaint'
import Cases from '@/pages/nyaymitra/Cases'
import CaseDetail from '@/pages/nyaymitra/CaseDetail'
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
            <Route path="/" element={<Landing />} />
            {/* NyayMitra */}
            <Route path="/nyaymitra" element={<NyayDashboard />} />
            <Route path="/nyaymitra/file" element={<FileComplaint />} />
            <Route path="/nyaymitra/cases" element={<Cases />} />
            <Route path="/nyaymitra/cases/:id" element={<CaseDetail />} />
            {/* PanchayatGPT */}
            <Route path="/panchayat" element={<PanchayatDashboard />} />
            <Route path="/panchayat/schemes" element={<SchemeSearch />} />
            <Route path="/panchayat/budget" element={<BudgetAllocation />} />
            <Route path="/panchayat/meetings" element={<MeetingMinutes />} />
            <Route path="/panchayat/grievances" element={<Grievances />} />
            {/* Admin */}
            <Route path="/admin" element={<Admin />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
