import { useEffect } from "react";
import { Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/authContext";
import Header from "../../components/Header";
import { initializeAndSyncPushToken } from "../../utils/notifications";

export default function PatientLayout() {
    const { isLoading, user, authenticate } = useAuth();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!isLoading && user) {
            authenticate("patient");
            // fire the background token initializatoin handshake
            initializeAndSyncPushToken(user.token);
        }
    }, [isLoading, user]);

    if (isLoading || !user || user.role !== "patient") {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.rootWrapper, { paddingTop: insets.top }]}>
            <Stack
                screenOptions={{
                    contentStyle: { backgroundColor: "#FFFFFF" },
                    header: () => <Header user={user} />
                }}
            >
                <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
                <Stack.Screen name="addMedication" options={{ title: "Add Medication" }} />
                <Stack.Screen name="historyLog" options={{ title: "History Log" }} />
            </Stack>
        </View>
    )
}

const styles = StyleSheet.create({
    rootWrapper: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF"
    }
})