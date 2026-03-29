import { Stack, Redirect } from "expo-router";

import { useAuth } from "@/context/authContext";

export default function CaregiverLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    if (user.role !== "caregiver") {
        return <Redirect href="/" />
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}