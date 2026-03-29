import { Stack, Redirect } from "expo-router";

import { useAuth } from "@/context/authContext";

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (user) {
        if (user.role === "patient") {
            return <Redirect href="/(patient)/dashboard" />;
        }
        if (user.role === "caregiver") {
            return <Redirect href="/(caregiver)/dashboard" />;
        }
    }

    return <Stack screenOptions={{ headerShown: false }} />
}