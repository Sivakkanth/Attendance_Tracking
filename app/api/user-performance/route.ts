import axios, { AxiosError } from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { exportToGoogleSheet } from '../../../utils/googleSheetExport';

const DESKLOG_BASE_URL = process.env.DESKLOG_BASE_URL || "https://app.desklog.io/api/v2/";
const DESKLOG_API_KEY = process.env.DESKLOG_API_KEY || "Bearer 1tevj6sw7pp4j3f0gec0addbw0hkbytahxaolnn3";

function formatDateForDesklog(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

async function fetchUsers() {
    const response = await axios.post(
        `${DESKLOG_BASE_URL}user_list`,
        null,
        {
            headers: {
                'Authorization': DESKLOG_API_KEY,
                'Content-Type': 'application/json',
            },
        }
    );
    return Array.isArray(response.data) ? response.data : response.data.data || [];
}


async function fetchUserAttendance(userId: number, fromDate: string, toDate: string) {
    try {
        const response = await axios.post(
            `${DESKLOG_BASE_URL}attendance_report`,
            {
                from_date: fromDate,
                to_date: toDate,
                user_id: userId.toString(),
            },
            {
                headers: {
                    'Authorization': DESKLOG_API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );
        if (response.data?.status && response.data?.data && Array.isArray(response.data.data)) {
            return response.data.data[0] || null;
        }
        return null;
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error(`Failed to fetch attendance for user ${userId}:`, axiosError.response?.data || axiosError.message);
        return null;
    }
}

export async function POST(req: NextRequest) {

// Default POST: fetch user performance data
    try {
        const apiKeyPrefix = DESKLOG_API_KEY ? DESKLOG_API_KEY.substring(0, 15) + '...' : 'missing';
        const { from_date, to_date, exportToGoogleSheet: exportToSheet } = await req.json();
        const spreadsheetId = process.env.GOOGLE_SHEET_ID || "1d0tisFmBnLOMLO0CgqH0LL1gYOhuh-gcF4ua5lKtu7U";

        if (!from_date || !to_date) {
            return NextResponse.json(
                { error: "from_date and to_date are required" },
                { status: 400 }
            );
        }

        const formattedFromDate = formatDateForDesklog(from_date);
        const formattedToDate = formatDateForDesklog(to_date);

        const users = await fetchUsers();
        const userPerformancePromises = users.map(async (user: any) => {
            const attendance = await fetchUserAttendance(user.id, formattedFromDate, formattedToDate);
            return {
                user,
                attendance,
            };
        });
        const userPerformanceData = await Promise.all(userPerformancePromises);

        // If exportToGoogleSheet is true, export and return the sheet URL
        if (exportToSheet) {
            // Prepare headers and rows
            const headers = [
                'Name',
                'Email',
                'Team',
                'Login / In Time',
                'Exit / Out Time',
                'Total Working Hours',
                'Lunch Break In',
                'Lunch Break Out',
                'Lunch Break Duration',
                'Net Working Time',
                'Productive Time',
                'Focus Time',
                'Idle Time',
                'Activity %',
                'Efficiency %',
            ];
            const rows = userPerformanceData.map(({ user, attendance }) => [
                user?.name || '',
                user?.email || '',
                user?.team_name || 'N/A',
                attendance?.clock_in || '',
                attendance?.clock_out || '',
                attendance?.time_at_work || '',
                'Not Available', // Lunch Break In
                'Not Available', // Lunch Break Out
                'Not Available', // Lunch Break Duration
                attendance?.productive_time || '', // Net Working Time (same as Productive Time)
                attendance?.productive_time || '',
                attendance?.focus_time || '',
                attendance?.idle_time || '',
                attendance?.activity_percentage ?? '',
                attendance?.efficiency_percentage ?? '',
            ]);
            let sheetTitle = '';
            if (from_date === to_date) {
                sheetTitle = `User Performance ${from_date}`;
            } else {
                sheetTitle = `User Performance ${from_date} to ${to_date}`;
            }
            try {
                const { url } = await exportToGoogleSheet({ sheetTitle, headers, rows, spreadsheetId });
                return NextResponse.json({ success: true, url });
            } catch (sheetError) {
                return NextResponse.json({ error: 'Failed to export to Google Sheets', details: (sheetError as Error).message }, { status: 500 });
            }
        }

        // Default: return data as JSON
        return NextResponse.json(userPerformanceData);
    } catch (error) {
        const axiosError = error as AxiosError;
        return NextResponse.json(
            {
                error: "Failed to fetch user performance data", 
                details: axiosError.response?.data || axiosError.message,
                env: {
                    hasApiKey: !!DESKLOG_API_KEY,
                    hasBaseUrl: !!DESKLOG_BASE_URL,
                    apiKeyPrefix: DESKLOG_API_KEY ? DESKLOG_API_KEY.substring(0, 15) + '...' : 'missing',
                    nodeEnv: process.env.NODE_ENV,
                }
            },
            { status: 500 }
        );
    }
}
