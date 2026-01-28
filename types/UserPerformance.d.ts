import { Attendance } from "./Attendance";
import { User } from "./User";

export interface UserPerformance {
    user: User;
    attendance?: Attendance;
}