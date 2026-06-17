import { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ToastAndroid } from "react-native";
import { useFocusEffect, router } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";
import { getLocalDateString } from "../../utils/dates";

interface PatientData {
    _id: string;
    name: string;
    username: string;
    role: 'patient' | 'caregiver';
    phone?: string;
    age?: number | null;
    gender: "male" | "female" | "prefer not to say";
    bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "not specified";
}

interface LinkedPatient {
    _id: string;
    caregiver: string;
    patient: PatientData;
    status: 'pending' | 'approved' | 'rejected' | 'revoked';
    initiatedBy: 'patient' | 'caregiver';
    updatedAt: string;
}

interface Medication {
    _id: string;
    name: string;
    type: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'cream' | 'other';
    dosage: {
        value: number;
        unit: 'mg' | 'mcg' | 'ml' | 'drops' | 'puffs' | 'units';
    };
    frequency: {
        type: 'daily' | 'specific days' | 'as needed (PRN)' | 'interval';
        specificDays?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
        intervalDays?: number;
    };
    schedule: {
        time: string;
        reminderId?: string;
    }[];
    startDate: Date;
    endDate?: Date;
    inventory: {
        trackingEnabled: boolean;
        currentQuantity?: number;
        refillThreshold?: number;
        lastRefilledDate?: Date;
    };
    instructions: 'before food' | 'with food' | 'after food' | 'empty stomach' | 'no preference';
    doctor?: {
        name: string;
        phone: string;
    };
    isActive: boolean;
    notes?: string;
};

export default function CaregiverDashboard() {
    const { user } = useAuth();

    const [patients, setPatients] = useState<LinkedPatient[]>([]);
    const [activePatient, setActivePatient] = useState<string | null>(null);

    const [isFetching, setIsFetching] = useState(true);

    const [medications, setMedications] = useState<Medication[]>([]);

    const [filterType, setFilterType] = useState<'all' | 'today'>('all');
    const [activeOnly, setActiveOnly] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchLinkedPatients();
        }, [])
    );

    useEffect(() => {
        if (activePatient) {
            fetchPatientData(activePatient);
        }
    }, [activePatient]);

    const fetchLinkedPatients = async () => {
        try {
            setIsFetching(true);

            const res = await fetch(`${BASE_URL}/api/link/myLinks`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await res.json();
            if (result.success) {
                const approvedLinks = result.data.filter((link: LinkedPatient) => link.status === 'approved');
                setPatients(approvedLinks);

                if (approvedLinks.length > 0 && !activePatient) {
                    setActivePatient(approvedLinks[0].patient._id);
                }
            } else {
                ToastAndroid.show(result.message || "Failed to load links", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Fetch links error: ", err);
            ToastAndroid.show("Server error", ToastAndroid.SHORT);
        } finally {
            setIsFetching(false);
        }
    };

    const fetchPatientData = async (patientId: string) => {
        try {
            setIsFetching(true);

            const res = await fetch(`${BASE_URL}/api/caregiver/patientsMeds/${patientId}`, {
                headers: {
                    Authorization: `Bearer ${user?.token}`
                }
            });

            const result = await res.json();

            if (result.success) {
                setMedications(result.data);
            }

            if (!result.success) {
                ToastAndroid.show(result.message || "Error pulling patient medications", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Data fetch failed: ", err);
            ToastAndroid.show("Failed to update dashboard data", ToastAndroid.SHORT);
        } finally {
            setIsFetching(false);
        }
    }

    const filterMedications = medications.filter(med => {
        if (activeOnly && !med.isActive) {
            return false;
        }

        if (filterType === "today") {
            const todayStr = getLocalDateString(new Date());
            const startString = getLocalDateString(new Date(med.startDate));
            const endString = med.endDate ? getLocalDateString(new Date(med.endDate)) : null;

            if (todayStr < startString) {
                return false;
            }

            if (endString && todayStr > endString) {
                return false;
            }

            if (med.frequency.type === 'as needed (PRN)' || med.frequency.type === "daily") {
                return true;
            }

            const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            if (med.frequency.type === "specific days") {
                return med.frequency.specificDays?.includes(todayName as any);
            }

            if (med.frequency.type === "interval" && med.frequency.intervalDays) {
                const start = new Date(startString);
                const today = new Date(todayStr);
                const diffTime = Math.abs(today.getTime() - start.getTime());
                const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
                return diffDays % med.frequency.intervalDays === 0;
            }
        }

        return true;
    });

    return (
        <View style={styles.container}>
            <View style={styles.selectorWrapper}>
                <Text style={styles.sectionTitle}>My Patients</Text>
                {isFetching ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        data={patients}
                        keyExtractor={(item) => item._id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.listContentContainer}
                        renderItem={({ item }) => {
                            const patient = item.patient;
                            const isSelected = patient._id === activePatient;

                            return (
                                <TouchableOpacity
                                    style={[styles.patientCard, isSelected && styles.selectedCard]}
                                    onPress={() => setActivePatient(patient._id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.avatarCircle, isSelected && styles.selectedAvatarCircle]}>
                                        <Text style={[styles.avatarText, isSelected && styles.selectedAvatarText]}>
                                            {patient.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={[styles.patientName, isSelected && styles.selectedPatientName]} numberOfLines={1}>
                                        {patient.username}
                                    </Text>
                                </TouchableOpacity>
                            )
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No linked Patients Found.</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <View style={styles.contentBody}>
                {isFetching ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : activePatient ? (
                    <>
                        <View style={styles.sectionHeaderRowInline}>
                            {filterType === "today" ? (
                                <Text style={styles.bodySectionHeader}>Today's Medications</Text>
                            ) : (
                                <Text style={styles.bodySectionHeader}>All Medications</Text>
                            )}
                            <TouchableOpacity
                                style={styles.viewLogsButton}
                                onPress={() => {
                                    router.push({
                                        pathname: '/(caregiver)/patientLogs',
                                        params: {
                                            id: activePatient
                                        }
                                    });
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.viewLogsButtonText}>View history</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={filterMedications}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.medsListContainer}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <View>
                                    <View style={styles.filterChipContainerTray}>
                                        <TouchableOpacity
                                            style={[styles.interactiveChip, activeOnly && styles.activeChipSelect]}
                                            onPress={() => setActiveOnly(!activeOnly)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.chipLabelText, activeOnly && styles.activeChipLabelSelect]}>Active only</Text>
                                        </TouchableOpacity>

                                        <View style={styles.verticalChipDividerLine} />

                                        <TouchableOpacity
                                            style={[styles.interactiveChip, filterType === "all" && styles.activeChipSelect]}
                                            onPress={() => setFilterType('all')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.chipLabelText, filterType === 'all' && styles.activeChipLabelSelect]}>All Meds</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.interactiveChip, filterType === "today" && styles.activeChipSelect]}
                                            onPress={() => setFilterType('today')}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.chipLabelText, filterType === 'today' && styles.activeChipLabelSelect]}>Today</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            }
                            renderItem={({ item }) => {
                                const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

                                return (
                                    <View style={[styles.medCard, !item.isActive && styles.inactiveMedCard]}>
                                        <View style={styles.medHeaderRow}>
                                            <View style={styles.medTitleContainer}>
                                                <Text style={styles.medNameText}>{item.name}</Text>
                                                <Text style={styles.medTypeText}>
                                                    {capitalize(item.type)} • {item.dosage.value} {item.dosage.unit}
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                                                <Text style={[styles.statusBadgeText, item.isActive ? styles.activeBadgeText : styles.inactiveBadgeText]}>
                                                    {item.isActive ? "Active" : "Inactive"}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.medDetailSection}>
                                            <Text style={styles.detailLabelText}>Frequency Pattern</Text>
                                            <Text style={styles.detailValueText}>
                                                {capitalize(item.frequency.type)}
                                                {item.frequency.type === 'specific days' && item.frequency.specificDays ?
                                                    `(${item.frequency.specificDays?.map(d => capitalize(d).substring(0, 3)).join(', ')})`
                                                    : ""}
                                                {item.frequency.type === "interval" && item.frequency.intervalDays ?
                                                    `(Evert ${item.frequency.intervalDays} days)`
                                                    : ""}
                                            </Text>
                                        </View>

                                        <View style={styles.metaInfoGrid}>
                                            <View style={styles.metaGridColumn}>
                                                <Text style={styles.detailLabelText}>Start Date</Text>
                                                <Text style={styles.metaValueText}>{getLocalDateString(new Date(item.startDate))}</Text>
                                            </View>
                                            {item.endDate && (
                                                <View style={styles.metaGridColumn}>
                                                    <Text style={styles.detailLabelText}>End Date</Text>
                                                    <Text style={styles.metaValueText}>{getLocalDateString(new Date(item.endDate))}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {item.doctor?.name ? (
                                            <View style={styles.doctorWrapperContainer}>
                                                <Text style={styles.detailLabelText}>Prescribing Doctor</Text>
                                                <Text style={styles.doctorNameText}>Dr. {item.doctor.name}</Text>
                                                {item.doctor.phone ? <Text style={styles.doctorPhoneText}>{item.doctor.phone}</Text> : null}
                                            </View>
                                        ) : null}

                                        <View style={styles.medFooterRow}>
                                            <View style={styles.instructionChip}>
                                                <Text style={styles.instructionChipText}>{capitalize(item.instructions)}</Text>
                                            </View>
                                            <View style={styles.timeScheduleWrapper}>
                                                {item.schedule.map((sch, index) => (
                                                    <View key={index} style={styles.timeTag}>
                                                        <Text style={styles.timeTagText}>{sch.time}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {item.inventory?.trackingEnabled && (item.inventory.currentQuantity ?? 0) <= (item.inventory.refillThreshold ?? 0) && (
                                            <View style={styles.lowStockWarning}>
                                                <Text style={styles.lowStockWarningText}>
                                                    Low Stock Alert: only {item.inventory.currentQuantity} remaining
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )
                            }}
                            ListEmptyComponent={
                                <View style={styles.noDataView}>
                                    <Text style={styles.emptyText}>No Medications prescribed for this patient.</Text>
                                </View>
                            }
                        />
                    </>
                ) : (
                    <Text style={styles.placeholderText}>Select a patient to begin overview</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    selectorWrapper: {
        paddingVertical: 16,
        backgroundColor: "#F9FAFB",
        borderBottomWidth: 1,
        borderColor: "#E5E7EB",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginLeft: 16,
        marginBottom: 12
    },
    listContentContainer: {
        paddingHorizontal: 12
    },
    patientCard: {
        alignItems: 'center',
        width: 84,
        marginHorizontal: 4,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF"
    },
    selectedCard: {
        backgroundColor: "#EFF6FF",
        borderColor: "#2563EB"
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6
    },
    selectedAvatarCircle: {
        backgroundColor: "#2563EB",
    },
    avatarText: {
        color: "#4B5563",
        fontSize: 16,
        fontWeight: "600",
    },
    selectedAvatarText: {
        color: "#FFFFFF"
    },
    patientName: {
        fontSize: 12,
        fontWeight: "500",
        color: "#4B5563",
        textAlign: "center",
        paddingHorizontal: 4
    },
    selectedPatientName: {
        color: "#2563EB",
        fontWeight: "700",
    },
    emptyContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: "center"
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280"
    },
    contentBody: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "stretch",
    },
    placeholderText: {
        color: "#6B7280",
        fontSize: 14
    },
    medsListContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    sectionHeaderRowInline: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: "center",
        marginBottom: 12,
        width: "100%"
    },
    bodySectionHeader: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 6
    },
    viewLogsButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: "#EFF6FF"
    },
    viewLogsButtonText: {
        color: "#2563EB",
        fontSize: 13,
        fontWeight: "600",
    },
    medCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    inactiveMedCard: {
        opacity: 0.6,
        backgroundColor: "#F9FAFB"
    },
    medHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12
    },
    medTitleContainer: {
        flex: 1,
        paddingRight: 8
    },
    medNameText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937"
    },
    medTypeText: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    activeBadge: {
        backgroundColor: "#DCFCE7"
    },
    inactiveBadge: {
        backgroundColor: "#F3F4F6"
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "600"
    },
    activeBadgeText: {
        color: "#15803D"
    },
    inactiveBadgeText: {
        color: "#4B5563"
    },
    medDetailSection: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#F3F4F6",
        paddingVertical: 8,
        marginBottom: 12
    },
    detailLabelText: {
        fontSize: 11,
        fontWeight: "500",
        color: "#9CA3AF",
        textTransform: "uppercase"
    },
    detailValueText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#374151",
        marginTop: 2
    },
    medFooterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    instructionChip: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#DBEAFE"
    },
    instructionChipText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#2563EB"
    },
    timeScheduleWrapper: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4
    },
    timeTag: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    timeTagText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151"
    },
    lowStockWarning: {
        backgroundColor: "#FEF2F2",
        padding: 8,
        borderRadius: 6,
        marginTop: 12,
        borderWidth: 1,
        borderColor: "#FEE2E2"
    },
    lowStockWarningText: {
        color: "#DC2626",
        fontSize: 12,
        fontWeight: "500"
    },
    noDataView: {
        paddingVertical: 32
    },
    filterChipContainerTray: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        paddingVertical: 4
    },
    interactiveChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    activeChipSelect: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB"
    },
    chipLabelText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4B5563"
    },
    activeChipLabelSelect: {
        color: "#FFFFFF"
    },
    verticalChipDividerLine: {
        width: 1,
        height: 20,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 4
    },
    metaInfoGrid: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 12
    },
    metaGridColumn: {
        flex: 1
    },
    metaValueText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#4B5563",
        marginTop: 2
    },
    doctorWrapperContainer: {
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6"
    },
    doctorNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: "#374151",
        marginTop: 2
    },
    doctorPhoneText: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 1
    }
});