import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";
import Header from "@/components/Header";

interface LogItem {
    _id: string;
    medication: {
        name: string,
        dosage: string;
    } | null;
    status: "taken" | "missed";
    dateString: string;
    scheduledTime: string;
}

export default function HistoryLog() {
    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();

    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchHistory = async () => {
                try {
                    const res = await fetch(`${BASE_URL}/api/adherence/history`, {
                        headers: { Authorization: `Bearer ${user?.token}` }
                    });

                    const result = await res.json();
                    if (result.success) {
                        setLogs(result.data);
                    }
                } catch (err) {
                    console.error("Failed to load history screen: ", err);
                } finally {
                    setLoading(false);
                }
            };
            if (user) {
                fetchHistory();
            }
        }, [user])
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            <Header user={user} signOut={signOut} />

            <View style={styles.body}>
                <Text style={styles.screenTitle}>Medication History Log</Text>

                <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    renderItem={({ item }) => {
                        const isTaken = item.status === "taken";
                        const formattedDate = new Date(item.dateString).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        });

                        return (
                            <View style={styles.logCard}>
                                <View style={[styles.statusIndicator, isTaken ? styles.bgTaken : styles.bgMissed]}>
                                    <Text style={[styles.statusIcon, { color: isTaken ? "#059669" : "#DC2626" }]}>{isTaken ? "✓" : "✕"}</Text>
                                </View>

                                <View style={styles.logDetails}>
                                    <Text style={styles.medName}>{item.medication?.name || "Deleted Medication"}</Text>
                                    <Text style={styles.medDosage}>{item.medication?.dosage || ""}</Text>
                                    <Text style={styles.timeStamp}>{formattedDate} at {item.scheduledTime}</Text>
                                </View>

                                <View style={styles.statusBadge}>
                                    <Text style={[styles.statusText, isTaken ? styles.textTaken : styles.textMissed]}>{item.status.toUpperCase()}</Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No historical logs recorded yet.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginVertical: 16
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    logCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1
    },
    statusIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center"
    },
    bgTaken: {
        backgroundColor: "#D1FAE5"
    },
    bgMissed: {
        backgroundColor: "#FEE2E2"
    },
    statusIcon: {
        fontSize: 16,
        fontWeight: "700"
    },
    logDetails: {
        flex: 1,
        marginLeft: 12
    },
    medName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827"
    },
    medDosage: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2
    },
    timeStamp: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 4
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    statusText: {
        fontSize: 12,
        fontWeight: "700"
    },
    textTaken: {
        color: "#059669"
    },
    textMissed: {
        color: "#DC2626"
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 14
    }
});