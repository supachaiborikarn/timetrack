import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name: string;
            email?: string | null;
            role: Role;
            stationId?: string | null;
            employeeId: string;
        };
    }

    interface User {
        id: string;
        name: string;
        email?: string | null;
        role: Role;
        stationId?: string | null;
        employeeId: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role;
        stationId?: string | null;
        employeeId: string;
    }
}
