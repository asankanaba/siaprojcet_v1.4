// src/stores/payroll.js
import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useAuthStore } from './auth.js'
import Swal from 'sweetalert2'

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    employees: [],
    attendanceRecords: [],
    payrollRecords: [],
    currentPayroll: null,
    loading: false,
    selectedAttendanceIds: [], // NEW: Track selected attendance IDs
    stats: {
      totalEmployees: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      onLeaveCount: 0
    }
  }),

  getters: {
    attendanceRate: (state) => {
      const total = state.attendanceRecords.length
      if (total === 0) return 0
      const present = state.attendanceRecords.filter(
        r => r.status?.toLowerCase() === 'present' || r.status?.toLowerCase() === 'late'
      ).length
      return Math.round((present / total) * 100)
    },
    
    // NEW: Get selected attendance records
    selectedAttendanceRecords: (state) => {
      return state.attendanceRecords.filter(r => state.selectedAttendanceIds.includes(r.id))
    },
    
    // NEW: Get unique employee IDs from selected attendance
    selectedEmployeeIds: (state) => {
      const ids = state.attendanceRecords
        .filter(r => state.selectedAttendanceIds.includes(r.id))
        .map(r => r.user_id)
      return [...new Set(ids)]
    }
  },

  actions: {
    // NEW: Toggle selection
    toggleSelection(id) {
      const index = this.selectedAttendanceIds.indexOf(id)
      if (index > -1) {
        this.selectedAttendanceIds.splice(index, 1)
      } else {
        this.selectedAttendanceIds.push(id)
      }
    },
    
    // NEW: Select all
    selectAll() {
      this.selectedAttendanceIds = this.attendanceRecords.map(r => r.id)
    },
    
    // NEW: Deselect all
    deselectAll() {
      this.selectedAttendanceIds = []
    },
    
    // NEW: Clear selection
    clearSelection() {
      this.selectedAttendanceIds = []
    },

    async fetchEmployees() {
      this.loading = true
      try {
        const response = await api.get('/users.php')
        if (Array.isArray(response.data)) {
          this.employees = response.data
        } else if (response.data && response.data.data) {
          this.employees = response.data.data
        }
        return this.employees
      } catch (error) {
        console.error('Error fetching employees:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchAttendance(startDate, endDate, employeeId = null) {
      this.loading = true
      try {
        let url = `/attendance.php?start=${startDate}&end=${endDate}`
        if (employeeId) {
          url += `&user_id=${employeeId}`
        }
        const response = await api.get(url)
        if (Array.isArray(response.data)) {
          this.attendanceRecords = response.data
        } else if (response.data && response.data.data) {
          this.attendanceRecords = response.data.data
        }
        this.updateStats()
        return this.attendanceRecords
      } catch (error) {
        console.error('Error fetching attendance:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async processPayroll(periodType, startDate, endDate, employeeIds = null) {
      this.loading = true
      try {
        const authStore = useAuthStore()
        
        console.log('📤 Processing payroll with params:', {
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          employee_ids: employeeIds,
          created_by: authStore.user?.id || 1
        })

        const response = await api.post('/payroll_process.php', {
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          employee_ids: employeeIds,
          created_by: authStore.user?.id || 1
        })

        console.log('📥 Raw payroll response:', response)
        console.log('📥 Response data:', response.data)

        // Check if we got a valid response
        if (!response.data) {
          return { 
            success: false, 
            message: 'No response data received from server',
            data: null
          }
        }

        // If response has success property
        if (response.data.success !== undefined) {
          this.currentPayroll = response.data.data
          this.payrollRecords = response.data.data?.details || []
          return response.data
        }
        
        // If response.data has data property
        if (response.data.data) {
          this.currentPayroll = response.data.data
          this.payrollRecords = response.data.data.details || []
          return { success: true, data: response.data.data }
        }
        
        // If response.data has details directly
        if (Array.isArray(response.data.details)) {
          this.payrollRecords = response.data.details
          return { success: true, data: response.data }
        }
        
        // If response has no success but has data
        if (Object.keys(response.data).length > 0) {
          this.payrollRecords = response.data.details || []
          return { success: true, data: response.data }
        }
        
        // Fallback
        return { 
          success: false, 
          message: 'Unknown response format',
          data: null
        }
        
      } catch (error) {
        console.error('❌ Error processing payroll:', error)
        console.error('Error details:', error.response?.data)
        
        if (error.response?.data) {
          return {
            success: false,
            message: error.response.data.message || 'Server error occurred',
            data: error.response.data
          }
        }
        
        return {
          success: false,
          message: error.message || 'Failed to process payroll',
          data: null
        }
      } finally {
        this.loading = false
      }
    },

    updateStats() {
      const records = this.attendanceRecords
      this.stats.totalEmployees = new Set(records.map(r => r.user_id)).size
      this.stats.presentCount = records.filter(r => r.status?.toLowerCase() === 'present').length
      this.stats.absentCount = records.filter(r => r.status?.toLowerCase() === 'absent').length
      this.stats.lateCount = records.filter(r => r.status?.toLowerCase() === 'late').length
      this.stats.onLeaveCount = records.filter(r => r.status?.toLowerCase() === 'on_leave').length
      
      this.stats.totalDeductions = records.reduce((sum, r) => sum + parseFloat(r.deduction || 0), 0)
      this.stats.totalNetPay = records.reduce((sum, r) => sum + parseFloat(r.net_pay || 0), 0)
    },

    exportPayrollReport() {
      if (this.payrollRecords.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No payroll records to export',
          confirmButtonColor: '#4F46E5'
        })
        return
      }

      const headers = ['Employee', 'Department', 'Date', 'Status', 'Salary Rate', 'Deduction', 'Net Pay']
      const rows = this.payrollRecords.map(r => [
        r.full_name || 'Unknown',
        r.department || 'General',
        r.date || 'N/A',
        r.status?.toUpperCase() || 'N/A',
        r.salary_rate || 0,
        r.deduction || 0,
        r.net_pay || 0
      ])

      let csv = headers.join(',') + '\n'
      rows.forEach(row => {
        csv += row.join(',') + '\n'
      })

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    }
  }
})