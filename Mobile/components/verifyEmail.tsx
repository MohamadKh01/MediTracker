import { View, Text, TextInput, StyleSheet, Pressable, ToastAndroid, Keyboard, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { emailVerification, resendVerification } from "../utils/emailVerification";

interface verifyEmailProps {
    email: string;
    onSuccess?: (data?: any) => void;
}

const RESEND_CD = 60;
const MAX_ATTEMPTS = 5;
const LOCKOUT_CD = 300;

export default function VerifyEmail({ email, onSuccess }: verifyEmailProps) {
    const insets = useSafeAreaInsets();

    const [code, setCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockoutTimer, setLockoutTimer] = useState(0);

    // handle resend cooldown
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;

        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        };
    }, [cooldown]);

    // handle rate limit lockout timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;

        if (lockoutTimer > 0) {
            timer = setInterval(() => {
                setLockoutTimer((prev) => {
                    if (prev <= 1) {
                        setFailedAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) {
                clearInterval(timer);
            }
        }
    }, [lockoutTimer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ""}${secs}`;
    }

    const handleVerify = async (codeToSubmit: string) => {
        Keyboard.dismiss();

        if (lockoutTimer > 0) {
            ToastAndroid.show(`Too many failed attempts. try again in ${formatTime(lockoutTimer)}`, ToastAndroid.LONG);
            return;
        }

        if (!codeToSubmit || codeToSubmit.trim().length !== 6) {
            ToastAndroid.show("Please enter the complete 6 digit code", ToastAndroid.LONG);
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await emailVerification({ email, code: codeToSubmit.trim() });

            ToastAndroid.show(result.message || "Email verified successfully!", ToastAndroid.SHORT);

            setFailedAttempts(0);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err: any) {
            const serverMessage = err.response?.data?.message || err.message;

            if (err.response?.status === 429) {
                setLockoutTimer(LOCKOUT_CD);
                ToastAndroid.show(serverMessage || "Too many failed attempts. Locked for 5 minutes", ToastAndroid.LONG);
                return;
            }

            const nextAttempts = failedAttempts + 1;
            setFailedAttempts(nextAttempts);

            if (nextAttempts >= MAX_ATTEMPTS) {
                setLockoutTimer(LOCKOUT_CD);
                ToastAndroid.show("Too many failed attempts. Locked for 5 minutes", ToastAndroid.LONG);
            }
            else {
                const remaining = MAX_ATTEMPTS - nextAttempts;
                ToastAndroid.show(`${err.message || "Verification Failed"} (${remaining} attempts) remaining`, ToastAndroid.LONG);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendCode = async () => {
        if (cooldown > 0 || isResending || lockoutTimer > 0) {
            return;
        }

        Keyboard.dismiss();

        try {
            setIsResending(true);

            const result = await resendVerification({ email });

            ToastAndroid.show(result.message || "A new Code has been sent!", ToastAndroid.SHORT);
            setCooldown(RESEND_CD);
            setFailedAttempts(0);
        } catch (err: any) {
            const serverMessage = err.response?.data?.message || err.message || "Failed to resend code";
            ToastAndroid.show(serverMessage, ToastAndroid.LONG);
        } finally {
            setIsResending(false);
        }
    };

    const handleCodeChange = (text: string) => {
        if (lockoutTimer > 0) {
            return;
        }

        const cleaned = text.replace(/[^0-9]/g, "");
        setCode(cleaned);

        if (cleaned.length === 6) {
            handleVerify(cleaned);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
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
                style={[styles.input, lockoutTimer > 0 && styles.inputDisabled]}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#9CA3AF"
                editable={!isSubmitting && lockoutTimer === 0}
            />

            {lockoutTimer > 0 && (
                <Text style={styles.lockoutWarningText}>
                    Too many incorrect attempts. try again in {formatTime(lockoutTimer)}
                </Text>
            )}

            <Pressable
                style={[styles.button, (isSubmitting || lockoutTimer > 0) && styles.buttonDisabled]}
                onPress={() => handleVerify(code)}
                disabled={isSubmitting || lockoutTimer > 0}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>
                        {lockoutTimer > 0 ? `Locked (${formatTime(lockoutTimer)})` : "Verify Code"}
                    </Text>
                )}
            </Pressable>

            <Pressable
                style={styles.resendButton}
                onPress={handleResendCode}
                disabled={isResending || cooldown > 0 || lockoutTimer > 0}
            >
                <Text style={[styles.resendText, (isResending || cooldown > 0 || lockoutTimer > 0) && styles.resendTextDisabled]}>
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
        paddingHorizontal: 20,
        flexGrow: 1
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
    inputDisabled: {
        backgroundColor: "#E5E7EB",
        borderColor: "#D1D5DB",
        color: "#9CA3AF"
    },
    lockoutWarningText: {
        color: "#DC2626",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 12,
        fontWeight: "500"
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