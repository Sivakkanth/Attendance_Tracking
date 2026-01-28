import { Attendance } from '@/types/Attendance';
import { User } from '@/types/User';
import axios from 'axios';

const BASE_URL = "https://app.desklog.io/api/v2/";
const API_KEY = "Bearer 1tevj6sw7pp4j3f0gec0addbw0hkbytahxaolnn3";

export class DeskloAPIService {
    static async fetchUserList(): Promise<User[] | undefined> {
        try {
            const response = await axios.post(`${BASE_URL}user_list`, {
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error(error);
        }
    }

    static async fetchAttendanceData(from_date: string, to_date: string, user_id: string): Promise<Attendance[] | undefined> {
        try {
            const response = await axios.post(`${process.env.BASE_URL}attendance_report`, {
                from_date,
                to_date,
                user_id,
                headers: {
                    'Authorization': process.env.API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error(error);
        }
    }
}