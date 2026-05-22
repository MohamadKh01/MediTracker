import { Stack, Redirect } from "expo-router";
import { Keyboard, KeyboardAvoidingView, Pressable, StyleSheet } from "react-native";

import { useAuth } from "@/context/authContext";

export default function AuthLayout() {
    const { user, isLoading } = useAuth();

    // wait until auth finish loading before rendering anything
    if (isLoading) {
        return null;
    }

    // if user is logged in, redirect depending on role
    if (user) {
        if (user.role === "patient") {
            return <Redirect href="/(patient)/dashboard" />;
        }
        if (user.role === "caregiver") {
            return <Redirect href="/(caregiver)/dashboard" />;
        }
    }

    return (
        // KeyboardAvoidingView prevents the keyboard from covering up input fields
        // it pushes the UI up when the keyboard opens
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
            {/* this pressable covers the entire screen, dismiss keyboard when user taps outside a text input */}
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
            {/* manage navigation between screens */}
            <Stack screenOptions={{ headerShown: false }} />
        </KeyboardAvoidingView>
    );
}