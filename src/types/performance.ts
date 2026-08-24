export interface ReviewPeriod {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    closedAt?: string | null;
}

export interface ReviewSubmission {
    id: string;
    employeeId: string;
    periodId: string;
    selfReview: string;
    managerReview?: string;
    rating?: number;
    status: "DRAFT" | "SUBMITTED" | "COMPLETED";
    submittedAt?: string;
    completedAt?: string;
    employee?: {
        name: string;
        nickName?: string;
        department?: { name: string };
    };
}
