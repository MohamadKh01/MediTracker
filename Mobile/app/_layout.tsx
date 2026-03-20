import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform, Keyboard, View, Pressable, StyleSheet } from "react-native";

import { AuthProvider, useAuth } from "@/context/authContext";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  if (isLoading)
    return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} >
      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" />
        ) : (
          <>
            {user.role === "patient" && <Stack.Screen name="(patient)" />}
            {user.role === "caregiver" && <Stack.Screen name="(caregiver)" />}
          </>
        )}
      </Stack>
    </KeyboardAvoidingView>
  );

}

export default function Layout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}