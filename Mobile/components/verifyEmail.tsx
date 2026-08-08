import { View, Text, TextInput, StyleSheet, Pressable, ToastAndroid, Keyboard, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { emailVerification, resendVerification } from "../utils/emailVerification";

interface verifyEmailProps {
    email: string;
    onSuccess?: (data?: any) => void;
}

const RESEND_CD = 60;

export default function VerifyEmail({ email, onSuccess }: verifyEmailProps) {
    const insets = useSafeAreaInsets();

    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (cooldown > 0) {
            timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleVerify = async (codeToSubmit: string) => {
        Keyboard.dismiss();

        if (!codeToSubmit || codeToSubmit.trim().length !== 6) {
            ToastAndroid.show("Please enter the complete 6 digit code", ToastAndroid.SHORT);
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await emailVerification({ email, code: codeToSubmit.trim() });

            ToastAndroid.show(result.message || "Email verified successfully!", ToastAndroid.SHORT);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            ToastAndroid.show(err.message || "Verification Failed", ToastAndroid.SHORT);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (cooldown > 0 || isResending) {
            return;
        }

        Keyboard.dismiss();

        try {
            setIsResending(true);

            const result = await resendVerification({ email });

            ToastAndroid.show(result.message || "A new Code has been sent!", ToastAndroid.SHORT);
            setCooldown(RESEND_CD);
        } catch (err: any) {
            ToastAndroid.show(err.message || "Failed to resend code", ToastAndroid.SHORT);
        } finally {
            setIsResending(false);
        }
    };

    const handleCodeChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, "");
        setCode(cleaned);

        if (cleaned.length === 6) {
            handleVerify(cleaned);
        }
    };

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top + 20 }]}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Verify Email</Text>

            <Text style={styles.subtitle}>
                Enter the 6-digit verification code sent to{"\n"}
                <Text style={styles.emailText}>{email}</Text>
            </Text>

            <Text style={styles.label}>Verification Code</Text>
            <TextInput
                style={styles.input}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                editable={!isSubmitting}
            />

            <Pressable
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleVerify(code)}
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                )}
            </Pressable>

            <Pressable
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={isResending || cooldown > 0}
            >
                <Text style={[styles.resendText, (isResending || cooldown > 0) && styles.resendTextDisabled]}>
                    {isResending
                        ? "Sending..."
                        : cooldown > 0
                            ? `Resend code in ${cooldown}s`
                            : "Didn't receive code? Resend"
                    }
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    scrollContainer: {
        paddingHorizontal: 20
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#1F2937"
    },
    subtitle: {
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 24,
        lineHeight: 20
    },
    emailText: {
        fontWeight: "bold",
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
        fontSize: 22,
        letterSpacing: 6,
        textAlign: "center"
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
    resendButton: {
        marginTop: 20,
        alignItems: "center"
    },
    resendText: {
        color: "#2563EB",
        fontSize: 14,
        fontWeight: "600"
    },
    resendTextDisabled: {
        color: "#9CA3AF"
    }
});