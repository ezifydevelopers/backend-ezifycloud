import { TeamMember, TeamFilters, TeamListResponse } from '../types';
export declare class TeamService {
    static getTeamMembers(managerId: string, filters: TeamFilters): Promise<TeamListResponse>;
    static getTeamMemberById(managerId: string, memberId: string): Promise<TeamMember | null>;
    static addTeamMember(managerId: string, memberData: {
        name: string;
        email: string;
        phone: string;
        department: string;
        role: string;
        position: string;
        salary: number;
        startDate: string;
        address: string;
        emergencyContact: string;
        emergencyPhone: string;
        notes?: string;
        isActive?: boolean;
    }): Promise<TeamMember>;
    static updateTeamMember(managerId: string, memberId: string, updateData: {
        name?: string;
        email?: string;
        password?: string;
        phone?: string;
        department?: string;
        position?: string;
        bio?: string;
        performance?: {
            overall?: number;
            attendance?: number;
            productivity?: number;
            teamwork?: number;
            communication?: number;
        };
    }): Promise<TeamMember>;
    static toggleTeamMemberStatus(managerId: string, memberId: string, isActive: boolean): Promise<TeamMember>;
    private static getMemberPerformance;
    private static getMemberRecentLeaves;
    static getTeamStats(managerId: string): Promise<{
        totalMembers: number;
        activeMembers: number;
        onLeave: number;
        averagePerformance: number;
        leaveUtilization: number;
        byDepartment: {
            [key: string]: number;
        };
        byRole: {
            [key: string]: number;
        };
    }>;
    static getTeamDepartments(managerId: string): Promise<string[]>;
    static getTeamMemberLeaveBalance(managerId: string, memberId: string): Promise<any>;
    private static getMemberLeaveBalance;
    static getTeamPerformanceMetrics(managerId: string): Promise<any>;
    static getTeamCapacityMetrics(managerId: string): Promise<any>;
}
//# sourceMappingURL=teamService.d.ts.map