import axios, { AxiosError } from 'axios';
import { NextRequest, NextResponse } from 'next/server';

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
    try {
        // Log for debugging in production (mask sensitive parts)
        const apiKeyPrefix = DESKLOG_API_KEY ? DESKLOG_API_KEY.substring(0, 15) + '...' : 'missing';
        console.log("Environment check:", {
            apiKeyPrefix,
            baseUrl: DESKLOG_BASE_URL,
            nodeEnv: process.env.NODE_ENV,
        });

        const { from_date, to_date } = await req.json();

        // Validate required parameters
        if (!from_date || !to_date) {
            return NextResponse.json(
                { error: "from_date and to_date are required" },
                { status: 400 }
            );
        }

        // Convert dates to Desklog format (DD-MM-YYYY)
        const formattedFromDate = formatDateForDesklog(from_date);
        const formattedToDate = formatDateForDesklog(to_date);

        console.log("Formatted dates:", { from: formattedFromDate, to: formattedToDate });

        // Fetch users
        const users = await fetchUsers();
        console.log(`Fetched ${users.length} users`);

        // Fetch attendance for each user in parallel
        const userPerformancePromises = users.map(async (user: any) => {
            const attendance = await fetchUserAttendance(user.id, formattedFromDate, formattedToDate);
            return {
                user,
                attendance,
            };
        });

        const userPerformanceData = await Promise.all(userPerformancePromises);

        return NextResponse.json(userPerformanceData);
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Desklog API error details:", {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            message: axiosError.message,
        });
        
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
