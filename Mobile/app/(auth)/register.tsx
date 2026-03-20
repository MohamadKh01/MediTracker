import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { RadioButton } from "react-native-paper";
import { useState } from "react";

import { BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/authContext";

export default function Register() {
  const { signIn } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("patient");
  const [phone, setPhone] = useState("");

  const handleRegister = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json", },
        body: JSON.stringify({ name, email, password, role, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Register failed");
      }

      await signIn(data);

    } catch (err: any) {
      alert(["Error: ", err.message]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <Text>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

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

      <Text>Role</Text>
      <RadioButton.Group value={role} onValueChange={(val: string) => setRole(val)}>
        <RadioButton.Item label="Patient" value="patient" />
        <RadioButton.Item label="Caregiver" value="caregiver" />
      </RadioButton.Group>

      <Text>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
      />

      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
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