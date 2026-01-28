export interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
    phone: string | null;
    team_id: number | string;
    team_name: string;
    user_type: string;
    role: string;
    time_zone: string;
    app_and_os: string | null;
}