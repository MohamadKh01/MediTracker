import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import { useState } from "react";

import { BASE_URL } from "@/constants/api";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        try{
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "content-type": "application/json", },
                body: JSON.stringify({ email, password, }),
            });

            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            Alert.alert("User logged in: ", JSON.stringify(data, null, 2));
        } catch (err: any) {
            Alert.alert("Error: ", err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <Text>Email</Text>
            <TextInput 
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <Text>Password</Text>
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

            <Pressable style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 80,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    padding: 12,
    marginBottom: 15,
    borderRadius: 6,
    backgroundColor: "#F9F9F9",
    color: "#000",
  },
  button: {
    backgroundColor: "#1E3A8A",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 6,
    backgroundColor: "#F9F9F9",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#000",
  },
  toggleText: {
    color: "#1E3A8A",
    fontWeight: "bold",
    paddingLeft: 10,
  },
});