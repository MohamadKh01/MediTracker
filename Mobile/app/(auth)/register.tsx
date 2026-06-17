import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, ToastAndroid, Keyboard } from "react-native";
import { RadioButton } from "react-native-paper";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BASE_URL } from "../../constants/api";
import { useAuth } from "../../context/authContext";

export default function Register() {
    const { user, signIn } = useAuth();
    const insets = useSafeAreaInsets();

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState("patient");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // send credentials to the backend and handle response
    const handleRegister = async () => {
        Keyboard.dismiss();
        // prevent empty request
        if (!email || !password || !username || !name) {
            ToastAndroid.show("Please fill all fields", ToastAndroid.SHORT);
            return;
        }

        try {
            setIsSubmitting(true);

            const res = await fetch(`${BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, username: username.trim(), email: email.trim(), password, role, phone }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Register failed");
            }

            signIn(data.data);
        } catch (err: any) {
            ToastAndroid.show(err.message || "Register failed", ToastAndroid.SHORT);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (user) {
        return null;
    }

    return (
        <ScrollView
            style={styles.outerContainer}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Register</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John doe"
                placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="John_doe"
                placeholderTextColor="#9CA3AF"
            />

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

            <Text style={styles.label}>Role</Text>
            <View style={styles.radioWrapper}>
                <RadioButton.Group value={role} onValueChange={(val: string) => setRole(val)}>
                    <RadioButton.Item label="Patient" value="patient" labelStyle={styles.radioLabel} color="#2563EB" />
                    <RadioButton.Item label="Caregiver" value="caregiver" labelStyle={styles.radioLabel} color="#2563EB" />
                </RadioButton.Group>
            </View>

            <Text style={styles.label}>Phone</Text>
            <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />

            <Pressable style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleRegister} disabled={isSubmitting}>
                <Text style={styles.buttonText}>{isSubmitting ? "Registering..." : "Register"}</Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    scrollContent: {
        paddingHorizontal: 20
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
        fontWeight: "500"
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
        marginTop: 12
    },
    buttonDisabled: {
        opacity: 0.5
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
        marginBottom: 16,
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
    radioWrapper: {
        marginBottom: 12,
        backgroundColor: "#F9F9F9",
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    radioLabel: {
        fontSize: 15,
        color: "#1F2937"
    }
});