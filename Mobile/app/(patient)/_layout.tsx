import { Stack, Redirect } from "expo-router";

import { useAuth } from "@/context/authContext";

export default function PatientLayout() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    if (user.role !== "patient") {
        return <Redirect href="/" />
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}