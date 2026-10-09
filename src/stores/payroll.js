// src/stores/payroll.js
// ============================================
// 💰 Payroll Store — Clean rewrite
// ============================================

import { defineStore } from 'pinia'
import api from '@/api/index.js'
import { useAuthStore } from './auth.js'
import Swal from 'sweetalert2'

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    employees:       [],
    payrollRecords:  [],
    currentPayroll:  null,
    holidays:        [],
    leaveRequests:   [],
    leaveTypes:      [],
    loading:         false,
    filters: {
      status: '',
      year:   '',
      from:   '',
      to:     '',
    },
  }),

  getters: {
    pendingCount:        (s) => s.payrollRecords.filter(r => r.status === 'pending').length,
    financeApprovedCount:(s) => s.payrollRecords.filter(r => r.status === 'finance_approved').length,
    approvedCount:       (s) => s.payrollRecords.filter(r => r.status === 'approved').length,
    paidCount:           (s) => s.payrollRecords.filter(r => r.status === 'paid').length,

    totalNetPay:   (s) => s.payrollRecords.reduce((sum, r) => sum + parseFloat(r.net_pay || 0), 0),
    totalDeductions: (s) => s.payrollRecords.reduce((sum, r) => sum + parseFloat(r.deductions || 0), 0),
  },

  actions: {
    // ============================================
    // EMPLOYEES
    // ============================================
    async fetchEmployees() {
      this.loading = true
      try {
        const { data } = await api.get('/users.php')
        const list = Array.isArray(data) ? data : (data.data || [])
        this.employees = list
        return this.employees
      } catch (e) {
        console.error('fetchEmployees:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    // ============================================
    // PAYROLL RECORDS
    // ============================================
    async fetchPayrollRecords(filters = {}) {
      this.loading = true
      try {
        const params = { ...this.filters, ...filters }
        Object.keys(params).forEach(k => !params[k] && delete params[k])

        const { data } = await api.get('/payroll.php', { params })
        const list = Array.isArray(data) ? data : (data.data || [])
        this.payrollRecords = list
        return list
      } catch (e) {
        console.error('fetchPayrollRecords:', e)
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchPayrollById(id) {
      try {
        const { data } = await api.get(`/payroll.php?id=${id}`)
        if (data.success) {
          this.currentPayroll = data.data
          return data.data
        }
        return null
      } catch (e) {
        console.error('fetchPayrollById:', e)
        return null
      }
    },

    // ============================================
    // PROCESS PAYROLL
    // ============================================
    async processPayroll(periodType, periodStart, periodEnd, employeeIds) {
      this.loading = true
      try {
        const auth = useAuthStore()
        const payload = {
          period_type:  periodType,
          period_start: periodStart,
          period_end:   periodEnd,
          employee_ids: employeeIds,
          created_by:   auth.user?.id || 1,
        }

        const { data } = await api.post('/payroll_process.php', payload)

        if (data.success) {
          await this.fetchPayrollRecords()
        }
        return data
      } catch (e) {
        console.error('processPayroll:', e)
        return {
          success: false,
          message: e.response?.data?.message || e.message || 'Failed to process payroll',
        }
      } finally {
        this.loading = false
      }
    },

    // ============================================
    // APPROVAL ACTIONS
    // ============================================
    async financeApprove(id) {
      return this._approvalAction(id, 'finance_approve', 'Finance approved')
    },

    async hrApprove(id) {
      return this._approvalAction(id, 'hr_approve', 'HR approved')
    },

    async markPaid(id) {
      return this._approvalAction(id, 'mark_paid', 'Marked as paid')
    },

    async reject(id, reason = 'Rejected') {
      return this._approvalAction(id, 'reject', 'Rejected', { reason })
    },

    async _approvalAction(id, action, successMessage, extra = {}) {
      try {
        const auth = useAuthStore()
        const { data } = await api.put(
          `/payroll.php?id=${id}&action=${action}`,
          { actor_id: auth.user?.id || 1, ...extra }
        )

        if (data.success) {
          await this.fetchPayrollRecords()
          return { success: true, message: data.message || successMessage, data }
        }
        return { success: false, message: data.message || 'Action failed' }
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || e.message || 'Action failed',
        }
      }
    },

    // ============================================
    // HOLIDAYS
    // ============================================
    async fetchHolidays(year = null) {
      try {
        const params = year ? { year } : {}
        const { data } = await api.get('/holidays.php', { params })
        this.holidays = Array.isArray(data) ? data : (data.data || [])
        return this.holidays
      } catch (e) {
        console.error('fetchHolidays:', e)
        return []
      }
    },

    async createHoliday(payload) {
      try {
        const auth = useAuthStore()
        const { data } = await api.post('/holidays.php', {
          ...payload,
          created_by: auth.user?.id || 1,
        })
        if (data.success) await this.fetchHolidays()
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || 'Failed to create holiday',
        }
      }
    },

    async updateHoliday(id, payload) {
      try {
        const { data } = await api.put(`/holidays.php?id=${id}`, payload)
        if (data.success) await this.fetchHolidays()
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || 'Failed to update holiday',
        }
      }
    },

    async deleteHoliday(id) {
      try {
        const { data } = await api.delete(`/holidays.php?id=${id}`)
        if (data.success) await this.fetchHolidays()
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || 'Failed to delete holiday',
        }
      }
    },

    // ============================================
    // LEAVE REQUESTS
    // ============================================
    async fetchLeaveRequests(filters = {}) {
      try {
        const { data } = await api.get('/leave_requests.php', { params: filters })
        this.leaveRequests = Array.isArray(data) ? data : (data.data || [])
        return this.leaveRequests
      } catch (e) {
        console.error('fetchLeaveRequests:', e)
        return []
      }
    },

    async createLeaveRequest(payload) {
      try {
        const { data } = await api.post('/leave_requests.php', payload)
        if (data.success) await this.fetchLeaveRequests()
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || 'Failed to submit leave',
        }
      }
    },

    async approveLeave(id) {
      return this._leaveAction(id, 'approve');
    },

    async rejectLeave(id) {
      return this._leaveAction(id, 'reject');
    },

    async _leaveAction(id, action) {
      try {
        const auth = useAuthStore()
        const { data } = await api.put(
          `/leave_requests.php?id=${id}&action=${action}`,
          { approved_by: auth.user?.id || 1 }
        )
        if (data.success) await this.fetchLeaveRequests()
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || `Failed to ${action} leave`,
        }
      }
    },

    // ============================================
    // SALARY / PROMOTIONS
    // ============================================
    async promoteEmployee(userId, newRate, newType, reason) {
      try {
        const auth = useAuthStore()
        const { data } = await api.post('/salary_history.php?action=promote', {
          user_id:          userId,
          new_salary_rate:  newRate,
          new_salary_type:  newType,
          reason,
          promoted_by:      auth.user?.id || 1,
        })
        return data
      } catch (e) {
        return {
          success: false,
          message: e.response?.data?.message || 'Failed to promote employee',
        }
      }
    },

    async fetchSalaryHistory(userId) {
      try {
        const { data } = await api.get(`/salary_history.php?user_id=${userId}`)
        return data.data || []
      } catch (e) {
        return []
      }
    },

    // ============================================
    // EXPORT
    // ============================================
    exportCsv() {
      const records = this.payrollRecords
      if (!records.length) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No payroll records to export',
          confirmButtonColor: '#4F46E5',
        })
        return
      }

      const headers = [
        'Employee', 'Department', 'Period Start', 'Period End',
        'Days Present', 'Days Late', 'Days Absent',
        'Basic Salary', 'Holiday Pay', 'Leave Pay',
        'Deductions', 'Net Pay', 'Status',
      ]

      const rows = records.map(r => [
        r.full_name || 'Unknown',
        r.department || 'General',
        r.period_start || '',
        r.period_end || '',
        r.days_present || 0,
        r.days_late || 0,
        r.days_absent || 0,
        r.basic_salary || 0,
        r.holiday_pay || 0,
        r.leave_pay || 0,
        r.deductions || 0,
        r.net_pay || 0,
        r.status || '',
      ])

      const csv = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `payroll_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  },
})