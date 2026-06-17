import { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ToastAndroid } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";
import { getLocalDateString } from "../../utils/dates";

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

export default function PatientLogs() {
    const { user } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [logs, setLogs] = useState<LogItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    const fetchLogs = async () => {
        try {
            setIsFetching(true);

            const res = await fetch(`${BASE_URL}/api/caregiver/patientsLogs/${id}`, {
                headers: {
                    Authorization: `Bearer ${user?.token}`
                }
            });

            const result = await res.json();

            if (result.success) {
                setLogs(result.data);
            } else {
                ToastAndroid.show(result.message || "Error pulling patient Logs", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Data fetch failed: ", err);
            ToastAndroid.show("Failed to update dashboard data", ToastAndroid.SHORT);
        } finally {
            setIsFetching(false);
        }
    }

    useFocusEffect(
        useCallback(() => {
            if (id) {
                fetchLogs();
            }
        }, [id])
    );

    return (
        <View style={styles.container}>
            {isFetching ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.logsList}
                    renderItem={({ item }) => {
                        const statusColors = {
                            taken: { bg: "#DCFCE7", text: "#15803D" },
                            missed: { bg: "#FEF2F2", text: "#DC2626" },
                            skipped: { bg: "#FEF3C7", text: "#D97706" }
                        }[item.status];

                        return (
                            <View style={styles.logCard}>
                                <View style={styles.timeBlock}>
                                    <Text style={styles.dateText}>
                                        {getLocalDateString(new Date(item.logDate))}
                                    </Text>
                                    <Text style={styles.timeText}>
                                        {item.scheduledTime}
                                    </Text>
                                </View>
                                <View style={styles.detailsBlock}>
                                    <Text style={styles.medName} numberOfLines={1}>
                                        {item.medication?.name || "Deleted Medication"}
                                    </Text>
                                    {item.notes ? (
                                        <Text style={styles.notesText} numberOfLines={1}>
                                            "{item.notes}"
                                        </Text>
                                    ) : null}
                                </View>
                                <View style={[styles.badge, { backgroundColor: statusColors?.bg }]}>
                                    <Text style={[styles.badgeText, { color: statusColors?.text }]}>
                                        {item.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No adherence logs for this Patient</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24
    },
    logsList: {
        padding: 16
    },
    logCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    timeBlock: {
        width: 75,
        borderRightWidth: 1,
        borderColor: "#F3F4F6",
        paddingRight: 4
    },
    dateText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#374151",
    },
    timeText: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 2
    },
    detailsBlock: {
        flex: 1,
        paddingHorizontal: 12,
    },
    medName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    notesText: {
        fontSize: 11,
        color: "#9CA3AF",
        fontStyle: "italic",
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        minWidth: 68,
        alignItems: "center"
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700"
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 14
    }
})