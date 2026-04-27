import { Stack, Redirect } from "expo-router";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet } from "react-native";

import { useAuth } from "@/context/authContext";

export default function CaregiverLayout() {
    const { user, isLoading } = useAuth();

    // wait for auth to finish loading before rendering anything
    if (isLoading) {
        return null;
    }

    // if no user is logged in, redirect to login page
    if (!user) {
        return <Redirect href="/(auth)/login" />;
    }

    // if user role is not caregiver, redirect ot index page
    if (user.role !== "caregiver") {
        return <Redirect href="/" />
    }

    return (
        // KeyboardAvoidingView prevents the keyboard from covering up input fields
        // it pushes the UI up when the keyboard opens
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} >
            {/* this pressable covers the entire screen, dismiss keyboard when user taps outside a text input */}
            <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
            {/* manage navigation between screens */}
            <Stack screenOptions={{ headerShown: false }} />
        </KeyboardAvoidingView>
    );
}