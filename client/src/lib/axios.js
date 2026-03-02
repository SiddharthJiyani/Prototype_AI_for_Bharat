import axios from 'axios'

// API Server (Node.js backend)
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
})

// AI Service (Python backend)
export const aiClient = axios.create({
  baseURL: import.meta.env.VITE_AI_URL || 'http://localhost:8000',
  withCredentials: false,
})

// Interceptor for API client to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
