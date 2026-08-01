import { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ToastAndroid, Pressable, Modal } from "react-native";
import { useFocusEffect, router } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";
import { getLocalDateString } from "../../utils/dates";
import { Calendar } from "react-native-calendars";

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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

interface DoseCard {
    doseKey: string;
    medication: Medication;
    scheduledTime: string;
    isPRN: boolean;
}

export default function CaregiverDashboard() {
    const { user } = useAuth();

    const [patients, setPatients] = useState<LinkedPatient[]>([]);
    const [medications, setMedications] = useState<Medication[] | null>([]);
    const [adherenceLogs, setAdherenceLogs] = useState<any[]>([]);

    const [isFetching, setIsFetching] = useState(true);
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    const [activePatient, setActivePatient] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

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

    // get patients connected to this caregiver
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
                const approvedLinks = result.data.filter((link: LinkedPatient) => link.status === "approved");
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

    // get medications and logs for all patients connected to this caregiver
    const fetchPatientData = async (patientId: string) => {
        try {
            setIsFetching(true);

            const medUrl = `${BASE_URL}/api/caregiver/patientsMeds/${patientId}`;
            const logUrl = `${BASE_URL}/api/caregiver/patientsLogs/${patientId}`;

            const [medRes, logRes] = await Promise.all([
                fetch(medUrl, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                }),
                fetch(logUrl, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                })
            ]);

            const medResult = await medRes.json();
            const logResult = await logRes.json();

            if (medResult.success && logResult.success) {
                setMedications(medResult.data);
                setAdherenceLogs(logResult.data);
            }
        } catch (err) {
            console.error("Data fetch failed: ", err);
            ToastAndroid.show("Failed to update dashboard data", ToastAndroid.SHORT);
        } finally {
            setIsFetching(false);
        }
    }

    // helper to shift days
    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    }

    // generate marked dates for the calendar
    const markedDates = useMemo(() => {
        const marks: any = {};

        // mark selected date as solid blue circle
        const selectedStr = getLocalDateString(selectedDate);
        marks[selectedStr] = { selected: true, selectedColor: "#2563EB" };

        // add dots for dates with medications
        medications?.forEach(med => {
            if (!med.isActive) {
                return;
            }

            const start = new Date(med.startDate);
            start.setHours(0, 0, 0, 0);

            const end = med.endDate ? new Date(med.endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
            end.setHours(23, 59, 59, 999);

            let runner = new Date(start.getTime());

            while (runner <= end) {
                const dateString = getLocalDateString(runner);
                let shouldMark = false;

                // conditional filtering based on frequency type
                if (med.frequency.type === "daily" || med.frequency.type === "as needed (PRN)") {
                    shouldMark = true;
                } else if (med.frequency.type === "specific days" && med.frequency.specificDays) {
                    const currentDayName = WEEKDAYS[runner.getDay()];
                    shouldMark = med.frequency.specificDays.includes(currentDayName);
                } else if (med.frequency.type === "interval" && med.frequency.intervalDays) {
                    const diffTime = Math.abs(runner.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    shouldMark = diffDays % med.frequency.intervalDays === 0;
                }

                if (shouldMark) {
                    marks[dateString] = { ...marks[dateString], marked: true, dotColor: "#2563EB" };
                }

                runner.setDate(runner.getDate() + 1);
            }
        });
        return marks;
    }, [medications, selectedDate]);

    // filter medications to only show the ones due on the selected date
    const filteredMedication = useMemo(() => {
        return medications?.filter(med => {
            if (!med.isActive) {
                return false;
            }

            const start = new Date(med.startDate);
            start.setHours(0, 0, 0, 0);

            const targetDate = new Date(selectedDate);
            targetDate.setHours(0, 0, 0, 0);
            if (targetDate < start) {
                return false;
            }

            if (med.endDate) {
                const end = new Date(med.endDate);
                end.setHours(0, 0, 0, 0);
                if (targetDate > end) {
                    return false;
                }
            }

            const freqType = med.frequency.type;
            if (freqType === "daily" || freqType === "as needed (PRN)") {
                return true;
            }

            else if (freqType === "specific days" && med.frequency.specificDays) {
                const currentDayName = WEEKDAYS[targetDate.getDay()];
                const targetDays = med.frequency.specificDays;
                return targetDays.includes(currentDayName);
            }

            else if (freqType === "interval" && med.frequency.intervalDays) {
                const diffTime = Math.abs(targetDate.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
                return diffDays % med.frequency.intervalDays === 0;
            }

            return false;
        });
    }, [medications, selectedDate]);

    // expand filtered medications into one dose card per scheduled time, PNR meds have only one card
    const doseCards = useMemo<DoseCard[]>(() => {
        return (filteredMedication || []).flatMap(med => {
            if (!med.schedule || med.schedule.length === 0) {
                return [{
                    doseKey: `${med._id}_prn`,
                    medication: med,
                    scheduledTime: '',
                    isPRN: true,
                } as DoseCard];
            }

            return med.schedule.map(slot => ({
                doseKey: `${med._id}_${slot.time}`,
                medication: med,
                scheduledTime: slot.time,
                isPRN: false,
            }));
        });
    }, [filteredMedication]);

    return (
        <View style={styles.container}>

            {/* patients selector section */}
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
                                    <Text style={[styles.patientName, isSelected && styles.selectedPatientName]}>
                                        {patient.username}
                                    </Text>
                                </TouchableOpacity>
                            )
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No linked Patients Found!</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <View style={styles.body}>
                {/* Date selector */}
                <View style={styles.dateSelector}>
                    {/* previous day */}
                    <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
                        <Text style={styles.dateNavText}>{"<"}</Text>
                    </TouchableOpacity>

                    {/* Current Day, show calendar when clicked */}
                    <Pressable onPress={() => setIsCalendarVisible(true)} style={styles.dateInfo}>
                        <Text style={styles.dateTitle}>{selectedDate.toDateString() === new Date().toDateString() ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: "long" })}</Text>
                        <Text style={styles.dateSubtitle}>{getLocalDateString(selectedDate)} ▾</Text>
                    </Pressable>

                    {/* Next Day */}
                    <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNavButton}>
                        <Text style={styles.dateNavText}>{">"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Calendar */}
                <Modal
                    visible={isCalendarVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setIsCalendarVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.contentCloser} onPress={() => setIsCalendarVisible(false)} />
                        <View style={styles.calendarContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Date</Text>
                                <TouchableOpacity onPress={() => setIsCalendarVisible(false)}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                            <Calendar
                                current={getLocalDateString(selectedDate)}
                                markedDates={markedDates}
                                onDayPress={(day) => {
                                    setSelectedDate(new Date(day.timestamp));
                                    setIsCalendarVisible(false);
                                }}
                                theme={{
                                    selectedDayBackgroundColor: "#2563EB",
                                    todayTextColor: "#2563EB",
                                    arrowColor: "#2563EB",
                                    dotColor: "#2563EB"
                                }}
                            />
                        </View>
                    </View>
                </Modal>

                <Text style={styles.sectionTitle}>Medications for this day:</Text>
                {isFetching ? (
                    // loader icon if medications not ready
                    <ActivityIndicator color="#2563EB" />
                ) : (
                    // medication cards list
                    <FlatList
                        data={doseCards}
                        keyExtractor={(item) => item.doseKey}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item: doseCard }) => {
                            const { medication: item, scheduledTime: currentSlotTime, isPRN, doseKey } = doseCard;
                            const isLowStock = item.inventory?.trackingEnabled && ((item.inventory.currentQuantity ?? 0) <= (item.inventory.refillThreshold ?? 0));
                            const activeDay = getLocalDateString(new Date(selectedDate));

                            const existingLog = !isPRN
                                ? adherenceLogs.find(log => {
                                    const parsedLogDateStr = getLocalDateString(new Date(log.logDate));
                                    const loggedMedId = typeof log.medication === "object" ? log.medication._id : log.medication;

                                    return loggedMedId === item._id &&
                                        log.scheduledTime === currentSlotTime &&
                                        parsedLogDateStr === activeDay;
                                })
                                : undefined;

                            const prnLogsToday = isPRN
                                ? adherenceLogs.filter(log => {
                                    const parsedLogDateStr = getLocalDateString(new Date(log.logDate));
                                    const loggedMedId = typeof log.medication === 'object' ? log.medication._id : log.medication;
                                    return loggedMedId === item._id && parsedLogDateStr === activeDay;
                                }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                                : [];

                            return (
                                <View style={styles.medCard}>
                                    <View style={styles.cardMainRow}>
                                        <View>
                                            <Text style={styles.medName}>{item.name}</Text>
                                            <Text style={styles.medSubtext}>
                                                {item.dosage.value} {item.dosage.unit} • {item.type}
                                            </Text>
                                        </View>

                                        {!isPRN && existingLog && (
                                            <View style={[
                                                styles.statusBadge,
                                                existingLog.status === 'taken' ? { backgroundColor: "#16A34A" } : { backgroundColor: "#EA580C" }
                                            ]}>
                                                <Text style={styles.statusBadgeText}>{existingLog.status.toUpperCase()}</Text>
                                            </View>
                                        )}

                                        {isPRN && prnLogsToday.length > 0 && (
                                            <View style={styles.prnHistoryContainer}>
                                                <Text style={styles.detailLabel}>Logged Today</Text>
                                                {prnLogsToday.map(log => (
                                                    <View key={log._id} style={[styles.statusBadge, log.status === 'taken' ? { backgroundColor: "#16A34A" } : { backgroundColor: "#EA580C" }]}>
                                                        <Text style={styles.statusBadgeText}>
                                                            {log.status.toUpperCase()} • {log.scheduledTime.slice(0, 5)}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        <View style={styles.timeBadge}>
                                            <Text style={styles.timeText}>
                                                {isPRN ? "As needed" : currentSlotTime}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    { /* Row 1: Instructions and supply */}
                                    <View style={styles.detailsGridRow}>
                                        <View style={styles.detailColumn}>
                                            <Text style={styles.detailLabel}>Instructions</Text>
                                            <Text style={styles.detailValue}>{item.instructions}</Text>
                                        </View>

                                        {item.inventory?.trackingEnabled && (
                                            <View style={styles.detailColumn}>
                                                <Text style={styles.detailLabel}>Remaining Supply</Text>
                                                <Text style={[styles.detailValue, isLowStock && styles.lowStockText]}>
                                                    {item.inventory.currentQuantity} units {isLowStock && '(low)'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Row 2: Doctor and notes */}
                                    <View style={styles.detailsGridRow}>
                                        {item.doctor?.name && (
                                            <View style={styles.detailColumn}>
                                                <Text style={styles.detailLabel}>Prescribing doctor</Text>
                                                <Text style={styles.detailValue}>{item.doctor.name} {item.doctor.phone ? `• ${item.doctor.phone}` : ""}</Text>
                                            </View>
                                        )}

                                        {item.notes && (
                                            <View style={styles.detailColumn}>
                                                <Text style={styles.detailLabel}>Personal Notes</Text>
                                                <Text style={styles.detailValue}>{item.notes}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )
                        }}
                    />
                )}
            </View>

        </View>
    )
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

    // patient selection section
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
    body: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },

    // selected day section
    dateSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        elevation: 2,
    },
    dateNavButton: {
        width: 40,
        height: 40,
        backgroundColor: "#EFF6FF",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    dateNavText: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#2563EB"
    },
    dateInfo: {
        alignItems: "center",
    },
    dateTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    dateSubtitle: {
        fontSize: 12,
        color: "#6B7280",
    },

    // calendar
    modalOverlay: {
        flex: 1,
        backgroundColor: "#00000080",
        justifyContent: "flex-end",
    },
    contentCloser: {
        flex: 1,
    },
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
        elevation: 12,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    closeText: {
        color: "#2563EB",
        fontWeight: '600',
    },

    // card list
    medCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        elevation: 2,
    },
    cardMainRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    medName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    medSubtext: {
        fontSize: 14,
        color: "#2563EB",
        marginTop: 2,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignSelf: "flex-start",
        marginBottom: 10
    },
    statusBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
    prnHistoryContainer: {
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
    },
    timeBadge: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    timeText: {
        color: "#2563EB",
        fontWeight: "700",
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginBottom: 15,
    },
    detailsGridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    detailColumn: {
        flex: 1
    },
    detailValue: {
        color: "#1F2937",
        fontWeight: "500",
    },
    lowStockText: {
        color: "#EF4444",
        fontWeight: "700",
    },
})