import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform, Keyboard, Pressable, StyleSheet } from "react-native";

import { AuthProvider } from "@/context/authContext";

function RootLayoutNav() {
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

export default function Layout() {
  return (
    // AuthProvider wraps the whole app and make sure every screen have access to user login status and data
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}