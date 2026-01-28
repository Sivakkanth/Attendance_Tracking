import { UserPerformance } from "@/types/UserPerformance";
import { DeskloAPIService } from "./desklogApi";

export class UserPerformanceService {
    static async userPerformanceReport(from_date: string, to_date: string): Promise<UserPerformance[] | undefined> {
        try {
            const users = await DeskloAPIService.fetchUserList();
            if (users && users.length > 0) {
                const performanceReports = [];
                for (const user of users) {
                    const attendanceData = await DeskloAPIService.fetchAttendanceData(from_date, to_date, user.id.toString());
                    if (attendanceData && attendanceData.length > 0) {
                        performanceReports.push({ user, attendance: attendanceData[0] });
                    }
                }
                return performanceReports;
            }
        } catch (error) {
            console.error(error);
        }
    }
}