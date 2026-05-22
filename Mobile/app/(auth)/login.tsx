import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";

export default function Login() {
  const { isLoading, user, signIn, checkLogin } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // check if user is logged in when the page loads
  useEffect(() => {
    if (!isLoading) {
      checkLogin();
    }
  }, [isLoading]);

  // send credentials to the backend and handle the response
  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", },
        body: JSON.stringify({ email, password, }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // if login successful, call the global signIn function to save user data
      await signIn(data);
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Error: ${err.message}`);
    }
  };

  // if auth is loading or user exists, show nothing, layout will redirect automatically
  if (isLoading || user) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Text style={styles.title}>Login</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />

        <Pressable onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.toggleText}>
            {showPassword ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleLogin} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? "Logging in..." : "Login"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#1F2937"
  },
  label: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    padding: 12,
    marginBottom: 16,
    borderRadius: 6,
    backgroundColor: "#F9F9F9",
    color: "#000",
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600"
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    backgroundColor: "#F9F9F9",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#000",
  },
  toggleText: {
    color: "#2563EB",
    fontWeight: "bold",
    paddingLeft: 10,
  },
});