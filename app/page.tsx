'use client';
import { UserPerformanceService } from '@/services/userPerformance';
import { UserPerformance } from '@/types/UserPerformance';
import { useEffect, useState } from 'react';

export default function Home() {
  const [users, setUsers] = useState<UserPerformance[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserPerformance | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';
      const response = await UserPerformanceService.userPerformanceReport(fromDate, toDate);
      if (!response) return;
      setUsers(response);
    };

    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Performance Dashboard</h1>
      <div className="flex gap-8">
        <div className="w-1/2">
          <h2 className="font-semibold mb-2">Users List</h2>
          <ul className="border p-2">
            {users.map(u => (
              <li
                key={u.user.id}
                className="cursor-pointer p-2 hover:bg-gray-100"
                onClick={() => setSelectedUser(u)}
              >
                {u.user.name} - Efficiency: {u.attendance?.efficiency_percentage || 'N/A'}%
              </li>
            ))}
          </ul>
        </div>

        {selectedUser && (
          <div className="w-1/2 border p-4">
            <h2 className="font-semibold mb-2">User Details</h2>
            <p><strong>Name:</strong> {selectedUser.user.name}</p>
            <p><strong>Email:</strong> {selectedUser.user.email}</p>
            <p><strong>Team:</strong> {selectedUser.user.team_name}</p>
            <p><strong>Clock In:</strong> {selectedUser.attendance?.clock_in}</p>
            <p><strong>Clock Out:</strong> {selectedUser.attendance?.clock_out}</p>
            <p><strong>Time at Work:</strong> {selectedUser.attendance?.time_at_work}</p>
            <p><strong>Productive Time:</strong> {selectedUser.attendance?.productive_time}</p>
            <p><strong>Efficiency:</strong> {selectedUser.attendance?.efficiency_percentage}%</p>
          </div>
        )}
      </div>
    </div>
  );
}