import { Text, View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "../context/authContext";

export default function Welcome() {
  const { user, isLoading, checkLogin } = useAuth();

  // check if user is logged in on first page load and when isLoadig state is updated
  useEffect(() => {
    if (!isLoading) {
      checkLogin();
    }
  }, [isLoading]);

  if (isLoading || user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* title / brand section */}
      <Text style={styles.title}>MediTracker</Text>
      <Text style={styles.subtitle}>Stay on Track. Stay Healthy</Text>

      {/* navigation section */}
      <Pressable style={styles.button} onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.registerButton]} onPress={() => router.push("/(auth)/register")}>
        <Text style={[styles.buttonText, styles.registerButtonText]}>Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2563EB"
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    color: "#4B5563"
  },
  button: {
    width: "100%",
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: "center",
    elevation: 2
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600"
  },
  registerButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    elevation: 0,
  },
  registerButtonText: {
    color: "#4B5563",
  },
});