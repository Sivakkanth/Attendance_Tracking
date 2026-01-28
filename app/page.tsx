'use client';
import { UserPerformance } from '@/types/UserPerformance';
import { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [users, setUsers] = useState<UserPerformance[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterEfficiency, setFilterEfficiency] = useState('');
  const [fromDate, setFromDate] = useState('2024-01-01');
  const [toDate, setToDate] = useState('2024-01-31');
  const [error, setError] = useState<string>('');

  // Validate date range
  const validateDateRange = (): boolean => {
    setError('');
    
    if (!fromDate || !toDate) {
      setError('Both From Date and To Date are required');
      return false;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    if (from > to) {
      setError('From Date must be before or equal to To Date');
      return false;
    }

    // Calculate difference in days
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      setError('Date range cannot exceed 31 days');
      return false;
    }

    // Check if dates are in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (from > today) {
      setError('From Date cannot be in the future');
      return false;
    }
    
    if (to > today) {
      setError('To Date cannot be in the future');
      return false;
    }

    return true;
  };

  const fetchUsers = async () => {
    if (!validateDateRange()) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch("/api/user-performance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_date: fromDate,
          to_date: toDate,
        }),
      });
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.error) {
        console.error("API Error:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Get unique teams for filter dropdown
  const teams = useMemo(() => {
    const uniqueTeams = new Set(users.map(u => u.user.team_name).filter(Boolean));
    return Array.from(uniqueTeams).sort();
  }, [users]);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = searchTerm === '' || 
        u.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTeam = filterTeam === '' || u.user.team_name === filterTeam;

      let matchesEfficiency = true;
      if (filterEfficiency) {
        const efficiency = getNumericEfficiency(u.attendance?.efficiency_percentage);
        switch (filterEfficiency) {
          case 'high': matchesEfficiency = efficiency >= 80; break;
          case 'medium': matchesEfficiency = efficiency >= 50 && efficiency < 80; break;
          case 'low': matchesEfficiency = efficiency < 50; break;
        }
      }

      return matchesSearch && matchesTeam && matchesEfficiency;
    });
  }, [users, searchTerm, filterTeam, filterEfficiency]);

  // Helper function to convert "--" to "0" or return the value
  const formatValue = (value: any, isPercentage = false): string | number => {
    if (value === '--' || value === null || value === undefined) {
      return isPercentage ? 0 : 'N/A';
    }
    return value;
  };

  // Helper function to get numeric efficiency value
  const getNumericEfficiency = (value: any): number => {
    if (value === '--' || value === null || value === undefined || value === '') {
      return 0;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredUsers.map(u => ({
      'Name': u.user.name,
      'Email': u.user.email,
      'Team': u.user.team_name || 'N/A',
      'Clock In': formatValue(u.attendance?.clock_in),
      'Clock Out': formatValue(u.attendance?.clock_out),
      'Time at Work': formatValue(u.attendance?.time_at_work),
      'Productive Time': formatValue(u.attendance?.productive_time),
      'Focus Time': formatValue(u.attendance?.focus_time),
      'Idle Time': formatValue(u.attendance?.idle_time),
      'Activity %': formatValue(u.attendance?.activity_percentage, true),
      'Efficiency %': formatValue(u.attendance?.efficiency_percentage, true),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Performance');
    
    // Auto-size columns
    const maxWidth = 20;
    const wscols = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));
    ws['!cols'] = wscols;
    
    XLSX.writeFile(wb, `user_performance_${fromDate}_to_${toDate}.xlsx`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTeam('');
    setFilterEfficiency('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">User Performance Dashboard</h1>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="text-red-700 hover:text-red-900"
              title="Close error message"
              aria-label="Close error message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                title="Select start date for performance data"
                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                title="Select end date for performance data"
                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Fetch Data'}
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredUsers.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-gray-700 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                title="Filter users by team"
                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Efficiency</label>
              <select
                value={filterEfficiency}
                onChange={(e) => setFilterEfficiency(e.target.value)}
                title="Filter users by efficiency level"
                className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="high">High (≥80%)</option>
                <option value="medium">Medium (50-79%)</option>
                <option value="low">Low (&lt;50%)</option>
              </select>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </div>

        {/* Users List and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Users List</h2>
            </div>
            <div className="overflow-auto max-h-[600px]">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading users...
                </div>
              ) : filteredUsers.sort((a, b) => (a.user.name.localeCompare(b.user.name))).length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredUsers.map(u => (
                    <li
                      key={u.user.id}
                      onClick={() => setSelectedUser(u)}
                      className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors ${
                        selectedUser?.user.id === u.user.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{u.user.name}</h3>
                          <p className="text-sm text-gray-600">{u.user.email}</p>
                          {u.user.team_name && (
                            <p className="text-xs text-gray-500 mt-1">Team: {u.user.team_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            getNumericEfficiency(u.attendance?.efficiency_percentage) >= 80 ? 'text-green-600' :
                            getNumericEfficiency(u.attendance?.efficiency_percentage) >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {getNumericEfficiency(u.attendance?.efficiency_percentage)}%
                          </div>
                          <p className="text-xs text-gray-500">Efficiency</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No users found
                </div>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
            </div>
            <div className="p-6">
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="pb-4 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedUser.user.name}</h3>
                    <p className="text-gray-600">{selectedUser.user.email}</p>
                    {selectedUser.user.team_name && (
                      <p className="text-sm text-gray-500 mt-1">Team: {selectedUser.user.team_name}</p>
                    )}
                  </div>

                  {selectedUser.attendance ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Clock In</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.clock_in === '--' ? 'N/A' : selectedUser.attendance.clock_in}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Clock Out</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.clock_out === '--' ? 'N/A' : selectedUser.attendance.clock_out}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Time at Work</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.time_at_work === '--' ? '0h 0m' : selectedUser.attendance.time_at_work}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Productive Time</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.productive_time === '--' ? '0h 0m' : selectedUser.attendance.productive_time}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Focus Time</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.focus_time === '--' ? '0h 0m' : selectedUser.attendance.focus_time}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Idle Time</p>
                        <p className="font-semibold text-gray-900">{selectedUser.attendance.idle_time === '--' ? '0h 0m' : selectedUser.attendance.idle_time}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-green-600 mb-1">Activity Percentage</p>
                        <p className="font-bold text-green-700 text-lg">{getNumericEfficiency(selectedUser.attendance.activity_percentage)}%</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Efficiency Percentage</p>
                        <p className="font-bold text-blue-700 text-lg">{getNumericEfficiency(selectedUser.attendance.efficiency_percentage)}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No attendance data available
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a user to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}