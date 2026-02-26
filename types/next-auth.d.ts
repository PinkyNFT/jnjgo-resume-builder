import { DefaultSession } from "next-auth";
import { UserRole } from "../types";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: UserRole | null;
        } & DefaultSession["user"];
    }

    interface User {
        role?: UserRole | null;
    }
}
