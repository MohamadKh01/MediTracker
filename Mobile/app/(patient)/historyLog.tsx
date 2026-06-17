import { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ToastAndroid, TouchableOpacity } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";

interface LogItem {
    _id: string;
    medication: {
        _id: string;
        name: string;
        dosage: {
            value: number;
            unit: 'mg' | 'mcg' | 'ml' | 'drops' | 'puffs' | 'units';
        };
        frequency: {
            type: 'daily' | 'specific days' | 'as needed (PRN)' | 'interval';
            specificDays?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
            intervalDays?: number;
        };
        startDate: Date;
        endDate?: Date;
        instructions: 'before food' | 'with food' | 'after food' | 'empty stomach' | 'no preference';
        doctor?: {
            name: string;
            phone: string;
        };
        notes?: string;
    } | null;
    status: "taken" | "missed" | "skipped";
    logDate: string;
    scheduledTime: string;
    takenAt: string;
    notes: string;
}

export default function HistoryLog() {
    const { user } = useAuth();

    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<String | null>(null);

    useFocusEffect(
        useCallback(() => {
            const fetchHistory = async () => {
                try {
                    setLoading(true);
                    const res = await fetch(`${BASE_URL}/api/adherence/report`, {
                        headers: { Authorization: `Bearer ${user?.token}` }
                    });

                    const result = await res.json();
                    if (result.success) {
                        const sortedLogs = result.data.sort((a: LogItem, b: LogItem) => {
                            const timeA = a.takenAt ? new Date(a.takenAt).getTime() : new Date(a.logDate).getTime();
                            const timeB = b.takenAt ? new Date(b.takenAt).getTime() : new Date(b.logDate).getTime();
                            return timeB - timeA;
                        });
                        setLogs(sortedLogs);
                    }
                } catch (err) {
                    console.error("Failed to load history screen: ", err);
                    ToastAndroid.show("Fetch failed", ToastAndroid.SHORT);
                } finally {
                    setLoading(false);
                }
            };
            if (user) {
                fetchHistory();
            }
        }, [user])
    );

    // keep it for later if we wanted to implement an editable note
    // const handleUpdateLogNote = async (logId: string, updatedText: string) => {
    //     try {
    //         const activeLog = logs.find(l => l._id === logId);
    //         if (!activeLog) {
    //             return;
    //         }

    //         const res = await fetch(`${BASE_URL}/api/adherence/log`, {
    //             method: "POST",
    //             headers: {
    //                 Authorization: `Bearer ${user?.token}`,
    //                 "Content-Type": "application/json"
    //             },
    //             body: JSON.stringify({
    //                 medication: typeof activeLog.medication === "object" ? activeLog.medication?._id : activeLog.medication,
    //                 scheduledTime: activeLog.scheduledTime,
    //                 logDate: activeLog.logDate,
    //                 status: activeLog.status,
    //                 notes: updatedText.trim()
    //             })
    //         });

    //         const result = await res.json();
    //         if (result.success) {
    //             setLogs(prev => prev.map(log => log._id === logId ? { ...log, notes: updatedText } : log));
    //             ToastAndroid.show("log note updated", ToastAndroid.SHORT);
    //         }
    //     } catch (err) {
    //         console.error("Failed to update note", err);
    //         ToastAndroid.show("Server error", ToastAndroid.SHORT);
    //     }
    // }

    const toggleExpandCard = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    }

    const getStatusStyle = (status: 'taken' | 'skipped' | 'missed') => {
        switch (status) {
            case 'taken':
                return { bg: styles.bgTaken, text: "#059669", icon: "✓", textClass: styles.textTaken };
            case 'missed':
                return { bg: styles.bgMissed, text: "#DC2626", icon: "✕", textClass: styles.textMissed };
            case 'skipped':
                return { bg: styles.bgSkipped, text: "#EA580C", icon: "->", textClass: styles.textSkipped };
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.body}>
                <Text style={styles.screenTitle}>Medication History Log</Text>

                <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const isExpanded = expandedId === item._id;
                        const statusConfig = getStatusStyle(item.status);
                        const medName = item.medication?.name || "Deleted Medication";
                        const doctorName = item.medication?.doctor?.name?.trim();
                        const instructions = item.medication?.instructions;
                        const logNotes = item.medication?.notes?.trim();
                        const frequencyStr = item.medication?.frequency?.type || "N/A";

                        const dosageDisplay = item.medication?.dosage
                            ? `${item.medication.dosage.value} ${item.medication.dosage.unit}`
                            : "N/A";

                        const formattedDate = new Date(item.logDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        });

                        const medStartStr = item.medication?.startDate
                            ? new Date(item.medication.startDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            }) : "N/A";

                        const medendStr = item.medication?.endDate
                            ? new Date(item.medication.endDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            }) : "Open schedule";

                        const actionTimeStr = item.takenAt
                            ? new Date(item.takenAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit"
                            }) : "N/A";

                        return (
                            <TouchableOpacity
                                style={styles.logCard}
                                activeOpacity={0.7}
                                onPress={() => toggleExpandCard(item._id)}
                            >
                                <View style={styles.cardHeaderRow}>
                                    <View style={[styles.statusIndicator, statusConfig.bg]}>
                                        <Text style={[styles.statusIcon, { color: statusConfig.text }]}>{statusConfig.icon}</Text>
                                    </View>

                                    <View style={styles.logDetails}>
                                        <Text style={styles.medName}>{medName}</Text>
                                        <Text style={styles.medDosage}>{dosageDisplay}</Text>
                                        <Text style={styles.timeStamp}>{formattedDate} at {item.scheduledTime}</Text>
                                    </View>

                                    <View style={styles.statusBadge}>
                                        <Text style={[styles.statusText, statusConfig.textClass]}>{item.status.toUpperCase()}</Text>
                                    </View>
                                </View>

                                {isExpanded && (
                                    <View style={styles.metaContainer}>
                                        <Text style={styles.metaText}>
                                            <Text style={styles.metaLabel}>Duration Track: </Text>
                                            {medStartStr} =&gt; {medendStr}
                                        </Text>

                                        <Text style={styles.metaText}>
                                            <Text style={styles.metaLabel}>frequency: </Text>
                                            {frequencyStr}
                                        </Text>
                                        {item.status === "taken" && (
                                            <Text style={styles.metaText}>
                                                <Text style={styles.metaLabel}>Taken at: </Text>
                                                {actionTimeStr}
                                            </Text>
                                        )}

                                        {doctorName && (
                                            <Text style={styles.metaText}>
                                                <Text style={styles.metaLabel}>Prescribed By: </Text>
                                                Dr. {doctorName}
                                            </Text>
                                        )}

                                        {instructions && instructions !== 'no preference' && (
                                            <Text style={styles.metaText}>
                                                <Text style={styles.metaLabel}>Instructions: </Text>
                                                Take {instructions}
                                            </Text>
                                        )}

                                        {logNotes && (
                                            <Text style={styles.metaText}>
                                                <Text style={styles.metaLabel}>Log Note: </Text>
                                                "{logNotes}""
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
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
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
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
    bgSkipped: {
        backgroundColor: "#FFEDD5"
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
    textSkipped: {
        color: "#EA580C"
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40
    },
    metaContainer: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        marginTop: 10,
        paddingTop: 8,
        gap: 6
    },
    metaText: {
        fontSize: 13,
        color: "#4B6663"
    },
    metaLabel: {
        fontWeight: "600",
        color: "#374151"
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 14
    }
});