<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="attendance-container">
          <!-- Header -->
          <div class="attendance-header">
            <div>
              <h2><i class="fas fa-user-clock"></i> My Attendance</h2>
              <p>View your attendance history and clock in/out</p>
            </div>
            <div class="header-actions">
              <button @click="toggleAttendance('in')" class="btn-clock-in" :disabled="clocking || isClockedIn">
                <i class="fas fa-sign-in-alt"></i> 
                {{ clocking ? 'Processing...' : 'Clock In' }}
              </button>
              <button @click="toggleAttendance('out')" class="btn-clock-out" :disabled="clocking || !isClockedIn">
                <i class="fas fa-sign-out-alt"></i> 
                {{ clocking ? 'Processing...' : 'Clock Out' }}
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: loading }"></i>
              </button>
            </div>
          </div>

          <!-- Status Card -->
          <div class="status-card" :class="isClockedIn ? 'clocked-in' : 'clocked-out'">
            <div class="status-icon">
              <i :class="isClockedIn ? 'fas fa-check-circle' : 'fas fa-clock'"></i>
            </div>
            <div class="status-info">
              <p class="status-label">Current Status</p>
              <p class="status-value">{{ isClockedIn ? 'Clocked In' : 'Clocked Out' }}</p>
              <p class="status-time" v-if="isClockedIn && currentClockIn">
                Since {{ formatTimeWithSeconds(currentClockIn) }}
              </p>
              <p class="status-time" v-if="isClockedIn">
                <span class="timer" id="timerDisplay">00:00:00</span>
              </p>
            </div>
            <div class="status-stats">
              <div class="stat-item">
                <span class="stat-label">Today's Hours</span>
                <span class="stat-value">{{ todayHours }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">This Week</span>
                <span class="stat-value">{{ weekHours }}</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-check-circle"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Present</p>
                <p class="summary-value">{{ presentDays }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-times-circle"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Absent</p>
                <p class="summary-value">{{ absentDays }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-clock"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Late</p>
                <p class="summary-value">{{ lateDays }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-calendar-alt"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Days</p>
                <p class="summary-value">{{ totalDays }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Month</label>
              <select v-model="filterMonth" class="form-control" @change="loadAttendance">
                <option v-for="m in months" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Year</label>
              <select v-model="filterYear" class="form-control" @change="loadAttendance">
                <option v-for="y in years" :key="y" :value="y">
                  {{ y }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="filterRecords">
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>
            <div class="filter-group">
              <button @click="loadAttendance" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Attendance Table -->
          <div class="attendance-table-wrapper">
            <table class="attendance-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>DAY</th>
                  <th>CLOCK IN</th>
                  <th>CLOCK OUT</th>
                  <th>HOURS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="5" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredRecords.length === 0">
                  <td colspan="5" class="text-center">No attendance records found</td>
                </tr>
                <tr v-for="record in filteredRecords" :key="record.id">
                  <td>{{ formatDate(record.date) }}</td>
                  <td>{{ getDayName(record.date) }}</td>
                  <td>{{ formatTimeWithSeconds(record.clock_in) }}</td>
                  <td>{{ formatTimeWithSeconds(record.clock_out) }}</td>
                  <td>{{ record.hours || calculateHours(record.clock_in, record.clock_out) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="attendance-footer">
            <span>Showing <strong>{{ filteredRecords.length }}</strong> records</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const authStore = useAuthStore();

// ============================================
// STATE
// ============================================
const attendanceRecords = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const clocking = ref(false);
const filterMonth = ref(new Date().getMonth() + 1);
const filterYear = ref(new Date().getFullYear());
const filterStatus = ref('all');
const isClockedIn = ref(false);
const currentClockIn = ref(null);
let timerInterval = null;
let elapsedSeconds = 0;

// ============================================
// HELPER: Get Philippines Time
// ============================================
const getPhilippinesTime = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime;
};

const getPhilippinesDateString = () => {
  const now = getPhilippinesTime();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTime = (time) => {
  if (!time) return null;
  let cleanTime = String(time).replace(/\s/g, '');
  if (!cleanTime) return null;
  if (cleanTime.match(/^\d:\d{2}:\d{2}$/)) {
    cleanTime = '0' + cleanTime;
  }
  if (cleanTime.match(/^\d{1}:\d{2}:\d{2}$/)) {
    cleanTime = '0' + cleanTime;
  }
  return cleanTime;
};

// ============================================
// COMPUTED
// ============================================
const presentDays = computed(() => {
  return attendanceRecords.value.filter(r => {
    const status = (r.status || '').toLowerCase();
    return status === 'present';
  }).length;
});

const absentDays = computed(() => {
  return attendanceRecords.value.filter(r => {
    const status = (r.status || '').toLowerCase();
    return status === 'absent';
  }).length;
});

const lateDays = computed(() => {
  return attendanceRecords.value.filter(r => {
    const status = (r.status || '').toLowerCase();
    return status === 'late';
  }).length;
});

const totalDays = computed(() => attendanceRecords.value.length);

const todayHours = computed(() => {
  const today = getPhilippinesDateString();
  const todayRecords = attendanceRecords.value.filter(r => r.date === today);
  let totalSeconds = 0;
  todayRecords.forEach(r => {
    if (r.clock_in && r.clock_out) {
      totalSeconds += calculateTotalSeconds(r.clock_in, r.clock_out);
    }
  });
  if (totalSeconds === 0) return '0h 0m 0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
});

const weekHours = computed(() => {
  const now = getPhilippinesTime();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  
  const weekRecords = attendanceRecords.value.filter(r => {
    if (!r.date) return false;
    const date = new Date(r.date);
    return date >= startOfWeek && date <= endOfWeek;
  });
  
  let totalSeconds = 0;
  weekRecords.forEach(r => {
    if (r.clock_in && r.clock_out) {
      totalSeconds += calculateTotalSeconds(r.clock_in, r.clock_out);
    }
  });
  
  if (totalSeconds === 0) return '0h 0m 0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
});

const filteredRecords = computed(() => {
  let result = [...attendanceRecords.value];
  
  if (filterStatus.value !== 'all') {
    const status = filterStatus.value.toLowerCase();
    result = result.filter(r => {
      const recordStatus = (r.status || '').toLowerCase();
      return recordStatus === status;
    });
  }
  
  result = result.filter(r => {
    if (!r.date) return false;
    try {
      const date = new Date(r.date);
      return date.getMonth() + 1 === filterMonth.value && date.getFullYear() === filterYear.value;
    } catch {
      return false;
    }
  });
  
  return result.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
});

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const years = computed(() => {
  const currentYear = getPhilippinesTime().getFullYear();
  const yearsArray = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    yearsArray.push(i);
  }
  return yearsArray;
});

// ============================================
// SAFE HELPERS
// ============================================
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila'
    });
  } catch {
    return 'N/A';
  }
};

const formatTimeWithSeconds = (time) => {
  if (!time) return '—';
  const normalized = normalizeTime(time);
  if (!normalized) return '—';
  if (time instanceof Date) {
    if (isNaN(time.getTime())) return '—';
    return time.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Manila'
    });
  }
  if (typeof time === 'string') {
    const parts = normalized.split(':');
    if (parts.length === 3) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      const seconds = parts[2].padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }
  return normalized;
};

const getDayName = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PH', {
      weekday: 'short',
      timeZone: 'Asia/Manila'
    });
  } catch {
    return 'N/A';
  }
};

const calculateTotalSeconds = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return 0;
  try {
    let inTime, outTime;
    const normalizedIn = normalizeTime(clockIn);
    const normalizedOut = normalizeTime(clockOut);
    if (!normalizedIn || !normalizedOut) return 0;
    if (clockIn instanceof Date) {
      inTime = clockIn;
    } else if (typeof clockIn === 'string' && clockIn.includes('T')) {
      inTime = new Date(clockIn);
    } else if (typeof clockIn === 'string') {
      inTime = new Date(`2000-01-01 ${normalizedIn}`);
    } else {
      return 0;
    }
    if (clockOut instanceof Date) {
      outTime = clockOut;
    } else if (typeof clockOut === 'string' && clockOut.includes('T')) {
      outTime = new Date(clockOut);
    } else if (typeof clockOut === 'string') {
      outTime = new Date(`2000-01-01 ${normalizedOut}`);
    } else {
      return 0;
    }
    if (isNaN(inTime.getTime()) || isNaN(outTime.getTime())) {
      return 0;
    }
    const diff = (outTime - inTime) / 1000;
    return Math.max(0, diff);
  } catch {
    return 0;
  }
};

const calculateHours = (clockIn, clockOut) => {
  const seconds = calculateTotalSeconds(clockIn, clockOut);
  if (seconds === 0) return '0h 0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
};

const filterRecords = () => {};

// ============================================
// TIMER
// ============================================
const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  let startTime;
  if (currentClockIn.value instanceof Date) {
    startTime = currentClockIn.value;
  } else if (typeof currentClockIn.value === 'string') {
    startTime = new Date(currentClockIn.value);
  } else {
    startTime = getPhilippinesTime();
  }
  if (isNaN(startTime.getTime())) {
    startTime = getPhilippinesTime();
  }
  elapsedSeconds = 0;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    const now = getPhilippinesTime();
    const diff = (now - startTime) / 1000;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = Math.floor(diff % 60);
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      timerDisplay.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

// ============================================
// ✅ FIXED: LOAD ATTENDANCE - Removed /api/ prefix
// ============================================
const loadAttendance = async () => {
  loading.value = true;
  try {
    const userId = authStore.user?.id;
    if (!userId) {
      console.warn('No user ID found');
      attendanceRecords.value = [];
      loading.value = false;
      return;
    }

    const today = getPhilippinesDateString();
    
    console.log('📅 Today is:', today);
    console.log('📅 Filter Month:', filterMonth.value);
    console.log('📅 Filter Year:', filterYear.value);
    
    // ✅ FIXED: Removed /api/ prefix
    const response = await api.get(
      `/attendance.php?user_id=${userId}&month=${filterMonth.value}&year=${filterYear.value}&date=${today}`
    );
    
    console.log('Raw API Response:', response.data);
    
    if (Array.isArray(response.data)) {
      attendanceRecords.value = response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      attendanceRecords.value = response.data.data;
    } else {
      attendanceRecords.value = [];
    }
    
    const todayRecords = attendanceRecords.value.filter(r => r.date === today);
    const activeRecord = todayRecords.find(r => r.clock_in && !r.clock_out);
    
    console.log('📋 All today records:', todayRecords);
    console.log('📋 Active record (clocked in):', activeRecord);
    
    if (activeRecord) {
      isClockedIn.value = true;
      const normalizedTime = normalizeTime(activeRecord.clock_in);
      const clockInDate = new Date(`${today}T${normalizedTime}+08:00`);
      currentClockIn.value = clockInDate;
      startTimer();
      console.log('✅ Clocked In - Status set to true');
    } else {
      isClockedIn.value = false;
      currentClockIn.value = null;
      stopTimer();
      console.log('❌ Clocked Out - Status set to false');
    }
    
  } catch (error) {
    console.error('Error loading attendance:', error);
    attendanceRecords.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// ✅ FIXED: TOGGLE ATTENDANCE - Removed /api/ prefix
// ============================================
const toggleAttendance = async (action) => {
  const userId = authStore.user?.id;
  if (!userId) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Please login first',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  if ((action === 'in' && isClockedIn.value) || (action === 'out' && !isClockedIn.value)) {
    console.log(`Action ${action} blocked. isClockedIn: ${isClockedIn.value}`);
    return;
  }

  clocking.value = true;
  
  try {
    const now = getPhilippinesTime();
    const timeStr = now.toTimeString().slice(0, 8);
    const dateStr = getPhilippinesDateString();
    
    console.log(`🔄 ${action === 'in' ? 'Clock In' : 'Clock Out'} attempt at ${timeStr}`);
    
    // ✅ FIXED: Removed /api/ prefix
    const response = await api.post('/attendance.php', {
      user_id: userId,
      action: action === 'in' ? 'clock_in' : 'clock_out',
      time: now.toISOString()
    });
    
    console.log('API Response:', response.data);
    
    if (response.data && response.data.success) {
      if (action === 'in') {
        console.log('✅ Clock In successful!');
        isClockedIn.value = true;
        currentClockIn.value = now;
        localStorage.setItem('clockedIn', 'true');
        localStorage.setItem('clockInTime', now.toISOString());
        startTimer();
        
        await Swal.fire({
          icon: 'success',
          title: 'Clocked In!',
          text: `You clocked in at ${formatTimeWithSeconds(now)}`,
          confirmButtonColor: '#4F46E5',
          timer: 2000,
          showConfirmButton: false
        });
        
        const todayRecord = attendanceRecords.value.find(r => r.date === dateStr);
        if (todayRecord) {
          todayRecord.clock_in = timeStr;
          todayRecord.status = now.getHours() >= 9 ? 'late' : 'present';
        } else {
          attendanceRecords.value.push({
            id: Date.now(),
            date: dateStr,
            clock_in: timeStr,
            clock_out: null,
            hours: null,
            status: now.getHours() >= 9 ? 'late' : 'present'
          });
        }
        
        console.log('✅ isClockedIn set to:', isClockedIn.value);
        
      } else {
        console.log('✅ Clock Out successful!');
        isClockedIn.value = false;
        stopTimer();
        localStorage.removeItem('clockedIn');
        localStorage.removeItem('clockInTime');
        
        const todayRecord = attendanceRecords.value.find(r => r.date === dateStr);
        if (todayRecord) {
          todayRecord.clock_out = timeStr;
          if (todayRecord.clock_in) {
            todayRecord.hours = calculateHours(todayRecord.clock_in, timeStr);
          }
        }
        
        await Swal.fire({
          icon: 'success',
          title: 'Clocked Out!',
          text: `You clocked out at ${formatTimeWithSeconds(now)}`,
          confirmButtonColor: '#4F46E5',
          timer: 2000,
          showConfirmButton: false
        });
        
        console.log('❌ isClockedIn set to:', isClockedIn.value);
      }
      
      await loadAttendance();
      
    } else {
      console.log('❌ API Error:', response.data?.message);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data?.message || 'Failed to record attendance',
        confirmButtonColor: '#4F46E5'
      });
    }
    
  } catch (error) {
    console.error('Attendance error:', error);
    clocking.value = false;
  } finally {
    clocking.value = false;
  }
};

// ============================================
// REFRESH
// ============================================
const refreshData = async () => {
  isRefreshing.value = true;
  await loadAttendance();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadAttendance();
  
  const clockedIn = localStorage.getItem('clockedIn');
  if (clockedIn === 'true') {
    const savedTime = localStorage.getItem('clockInTime');
    if (savedTime) {
      isClockedIn.value = true;
      currentClockIn.value = new Date(savedTime);
      if (!isNaN(currentClockIn.value.getTime())) {
        startTimer();
        console.log('✅ Restored clocked in state from localStorage');
      } else {
        localStorage.removeItem('clockedIn');
        localStorage.removeItem('clockInTime');
        isClockedIn.value = false;
        currentClockIn.value = null;
        console.log('❌ Invalid saved time, cleared state');
      }
    }
  }
});

onBeforeUnmount(() => {
  stopTimer();
});

watch([filterMonth, filterYear], () => {
  loadAttendance();
});
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  padding: 0;
  background: #f1f5f9;
  flex: 1;
}

body.dark-mode .page-content {
  background: #0f172a;
}

.attendance-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* HEADER */
.attendance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.attendance-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .attendance-header h2 {
  color: #e2e8f0;
}

.attendance-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .attendance-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-clock-in {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-clock-in:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
}

.btn-clock-in:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clock-out {
  background: #EF4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-clock-out:hover:not(:disabled) {
  background: #DC2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239,68,68,0.3);
}

.btn-clock-out:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-refresh {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  color: #1f2937;
  transition: all 0.2s;
}

body.dark-mode .btn-refresh {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.btn-refresh:hover {
  background: #f9fafb;
  border-color: #4F46E5;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* STATUS CARD */
.status-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  border-left: 4px solid #6b7280;
}

body.dark-mode .status-card {
  background: #1e293b;
}

.status-card.clocked-in {
  border-left-color: #10B981;
}

.status-card.clocked-out {
  border-left-color: #6b7280;
}

.status-icon {
  font-size: 2.5rem;
}

.status-card.clocked-in .status-icon {
  color: #10B981;
}

.status-card.clocked-out .status-icon {
  color: #6b7280;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

body.dark-mode .status-label {
  color: #9ca3af;
}

.status-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .status-value {
  color: #e2e8f0;
}

.status-time {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .status-time {
  color: #9ca3af;
}

.timer {
  font-size: 1.2rem;
  font-weight: 600;
  color: #4F46E5;
  font-family: 'Courier New', monospace;
}

.status-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-item .stat-label {
  font-size: 0.7rem;
  color: #6b7280;
  display: block;
}

.stat-item .stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .stat-item .stat-value {
  color: #e2e8f0;
}

/* SUMMARY CARDS */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

body.dark-mode .summary-card {
  background: #1e293b;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

body.dark-mode .summary-label {
  color: #9ca3af;
}

.summary-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .summary-value {
  color: #e2e8f0;
}

/* FILTERS */
.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

body.dark-mode .filters-section {
  background: #1e293b;
}

.filter-group {
  flex: 1;
  min-width: 120px;
}

.filter-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

body.dark-mode .filter-group label {
  color: #9ca3af;
}

.form-control {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
  color: #1f2937;
}

body.dark-mode .form-control {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
}

.btn-filter {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 40px;
}

.btn-filter:hover {
  background: #4338CA;
}

/* TABLE */
.attendance-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .attendance-table-wrapper {
  background: #1e293b;
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
}

.attendance-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .attendance-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.attendance-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .attendance-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.attendance-table tr:last-child td {
  border-bottom: none;
}

.attendance-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .attendance-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

/* FOOTER */
.attendance-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .attendance-footer {
  background: #1e293b;
  color: #9ca3af;
}

.attendance-footer strong {
  color: #1a1a2e;
}

body.dark-mode .attendance-footer strong {
  color: #e2e8f0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .attendance-container {
    padding: 1rem;
  }
  
  .attendance-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions button {
    flex: 1;
    justify-content: center;
  }
  
  .status-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .status-stats {
    width: 100%;
    justify-content: center;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: 100%;
  }
  
  .summary-cards {
    grid-template-columns: 1fr 1fr;
  }
  
  .attendance-table-wrapper {
    overflow-x: auto;
  }
  
  .attendance-table {
    font-size: 0.8rem;
    min-width: 600px;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .status-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>