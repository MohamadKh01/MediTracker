import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, ToastAndroid, RefreshControl, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";

interface MedicationItem {
    _id: string;
    name: string;
    dosage: string;
    frequency: string;
    active: boolean;
}

interface complianceLog {
    _id: string;
    medicationName: string;
    takenAt: string;
    status: "taken" | "missed";
    dateString: string;
    timeString: string;
}

interface InspectionState {
    profile: {
        name: string;
        email: string;
        phone: string;
    };
    medications: MedicationItem[];
    logs: complianceLog[];
}

export default function PatientInspectionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const insets = useSafeAreaInsets();

    const [inspectData, setInspectData] = useState<InspectionState | null>(null);
    const [fetching, setFetching] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPatientProfileLogs = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/caregiver/patient/${id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            const result = await res.json();

            if (res.ok && result.success) {
                setInspectData(result.data);
            } else {
                ToastAndroid.show(result.message || "Failed to fetch log details", ToastAndroid.SHORT);
                router.back();
            }
        } catch (err) {
            console.error("log parsing connection error: ", err);
            ToastAndroid.show("Network verification error", ToastAndroid.SHORT);
        } finally {
            setFetching(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!isLoading && user && id) {
                fetchPatientProfileLogs();
            }
        }, [isLoading, user, id])
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPatientProfileLogs();
    };

    if (isLoading || fetching && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.customHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Patient Profile</Text>
                <View style={{ width: 60 }} />
            </View>

            <FlatList
                data={inspectData?.logs}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2563EB"]} />}
                ListHeaderComponent={
                    <>
                        <View style={styles.infoCard}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>
                                    {inspectData?.profile.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.infoName}>{inspectData?.profile.name}</Text>
                            <Text style={styles.infoMeta}>{inspectData?.profile.email}</Text>
                            <Text style={styles.infoMeta}>{inspectData?.profile.phone}</Text>
                        </View>

                        <Text style={styles.subTitleBlock}>Monitored schedule</Text>
                        {inspectData?.medications.length === 0 ? (
                            <View style={styles.emptyCardContainer}>
                                <Text style={styles.emptyCardText}>No active medications</Text>
                            </View>
                        ) : (
                            inspectData?.medications.map((med) => (
                                <View key={med._id} style={styles.medicationRowCard}>
                                    <View style={styles.medIndicatorDecoration} />
                                    <View style={{ margin: 12, flex: 1 }}>
                                        <Text style={styles.medNameText}>{med.name}</Text>
                                        <Text style={styles.medMetaText}>{med.dosage} • {med.frequency}</Text>
                                    </View>
                                </View>
                            ))
                        )}

                        <Text style={styles.subTitleBlock}>Adherence Logs</Text>
                    </>
                }
                renderItem={({ item }) => (
                    <View style={styles.timelineRowCard}>
                        <View style={styles.timelineLeftContent}>
                            <Text style={styles.timelineMedName}>{item.medicationName}</Text>
                            <Text style={styles.timelineTimeStampText}>{item.dateString} at {item.timeString}</Text>
                        </View>
                        <View style={[styles.statusBadge, item.status === "taken" ? styles.statusBadgeTaken : styles.statusBadgeMissed]}>
                            <Text style={[styles.statusBadgeText, item.status === "taken" ? styles.textTaken : styles.textMissed]}>{item.status.toUpperCase()}</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No adherence logged</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6"
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    customHeader: {
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1
    },
    backBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        justifyContent: "center"
    },
    backBtnText: {
        color: "#2563EB",
        fontSize: 15,
        fontWeight: "600"
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
        flex: 1
    },
    infoCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1
    },
    avatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#DBEAFE",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12
    },
    avatarLargeText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#2563EB"
    },
    infoName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827"
    },
    infoMeta: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2
    },
    subTitleBlock: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginTop: 20,
        marginBottom: 10
    },
    emptyCardContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    emptyCardText: {
        color: "#6B7280",
        fontSize: 13
    },
    medicationRowCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    medIndicatorDecoration: {
        width: 4,
        height: 32,
        borderRadius: 2,
        backgroundColor: "#2563EB"
    },
    medNameText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827"
    },
    medMetaText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 1
    },
    timelineRowCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    timelineLeftContent: {
        flex: 1,
        paddingRight: 8
    },
    timelineMedName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827"
    },
    timelineTimeStampText: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    statusBadgeTaken: {
        backgroundColor: "#D1FAE5"
    },
    statusBadgeMissed: {
        backgroundColor: "#FEE2E2"
    },
    statusBadgeText: {
        fontSize: 11,
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
        marginTop: 20
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 13
    }
});