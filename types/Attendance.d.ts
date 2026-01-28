export interface Attendance {
    user_id: number;
    employee_id: string | null;
    name: string;
    email: string;
    team_name: string;
    clock_in: string;
    clock_out: string;
    time_at_work: string;
    productive_time: string;
    focus_time: string;
    offline_work_time: string;
    idle_time: string;
    private_time: string;
    neutral_time: string;
    non_productive_time: string;
    over_time: string;
    minimum_working_hours: string;
    activity_percentage: number;
    efficiency_percentage: number;
    task_assigned_time: string;
    task_spent_time: string;
    isWorkWithIdle: number;
    time_zone: string;
    client_app_details: string;
}