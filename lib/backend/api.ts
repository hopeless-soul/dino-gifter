// lib/backend/api.ts
import axios from 'axios'
import { getAuthUser, clearAuthUser } from './auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use(config => {
  const user = getAuthUser()
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearAuthUser()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
