import { Stack } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/authContext";
import Header from "../../components/Header";

export default function SharedLayout() {
    const { isLoading, user } = useAuth();
    const insets = useSafeAreaInsets();

    if (isLoading || !user) {
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
                <Stack.Screen name="profile" options={{ title: "Profile" }} />
                <Stack.Screen name="connections" options={{ title: "Connections" }} />
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