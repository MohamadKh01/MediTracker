import { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Modal, StatusBar, FlatList, ToastAndroid, ActivityIndicator, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";
import { getLocalDateString } from "../../utils/dates";
import { syncTodayReminders, cancelMissedDoseNotification } from "../../utils/reminderManager";

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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

export default function PatientDashboard() {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [adherenceLogs, setAdherenceLogs] = useState<any[]>([]);
    const [fetching, setFetching] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchMedications();
            }
        }, [user])
    );

    // fetch medications from database
    const fetchMedications = async () => {
        try {
            setFetching(true);

            const medUrl = `${BASE_URL}/api/medications`;
            const logUrl = `${BASE_URL}/api/adherence/report`;

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

            if (medResult.success) {
                setMedications(medResult.data);
                syncTodayReminders(medResult.data);
            }

            if (logResult.success) {
                setAdherenceLogs(logResult.data);
            }
        } catch (err) {
            console.error("Medication fetching error: ", err);
            ToastAndroid.show("Failed to fetch medications", ToastAndroid.SHORT);
        } finally {
            setFetching(false);
        }
    }

    // helper to shift calendar date
    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    }

    // generate marked dates for the calendar
    const markedDates = useMemo(() => {
        const marks: any = {};

        // mark the selected date as solid blue circle
        const selectedStr = getLocalDateString(selectedDate);
        marks[selectedStr] = { selected: true, selectedColor: "#2563EB" };

        // add dots for dates with medications
        medications.forEach(med => {
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
                    marks[dateString] = { ...marks[dateString], marked: true, dotColor: "#2563EB", };
                }

                runner.setDate(runner.getDate() + 1);
            }
        });
        return marks;
    }, [medications, selectedDate]);

    // Filter medications to only show the ones due on the selected date
    const filterMedication = useMemo(() => {
        return medications.filter(med => {
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

            const frequencyType = med.frequency.type;

            if (frequencyType === 'daily' || frequencyType === 'as needed (PRN)') {
                return true;
            }

            else if (frequencyType === 'specific days' && med.frequency.specificDays) {
                const currentDayName = WEEKDAYS[targetDate.getDay()];
                const targetDays = med.frequency.specificDays;
                return targetDays.includes(currentDayName);
            }

            else if (frequencyType === 'interval' && med.frequency.intervalDays) {
                const diffTime = Math.abs(targetDate.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
                return diffDays % med.frequency.intervalDays === 0;
            }

            return false;
        });
    }, [medications, selectedDate]);

    // expand filtered medications into one dose card per scheduled time, PRN meds have only one card
    const doseCards = useMemo<DoseCard[]>(() => {
        return filterMedication.flatMap(med => {
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
    }, [filterMedication]);

    // save the id of the medication card we want to expand
    const toggleExpandedId = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    }

    // navigate to edit page
    const handleEditMedication = (med: any) => {
        router.push({
            pathname: '/(patient)/addMedication',
            params: {
                medication: JSON.stringify(med)
            }
        });
    }

    const handleDeleteMedication = async (id: string) => {
        Alert.alert(
            "Delete Medication",
            "Are you sure you want to remove this medication from your schedule?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                }, {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const url = `${BASE_URL}/api/medications/${id}`;
                            const res = await fetch(url, {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${user?.token}`,
                                    "Content-Type": "application/json"
                                }
                            });

                            if (res.ok) {
                                setMedications((prev) => prev.filter((med) => med._id !== id));
                                syncTodayReminders(medications);
                                ToastAndroid.show("Medication deleted", ToastAndroid.SHORT);
                            } else {
                                const result = await res.json();
                                ToastAndroid.show(result.message || "Deletion failed", ToastAndroid.SHORT);
                            }
                        } catch (err) {
                            console.error("Fetch error: ", err);
                            ToastAndroid.show("Deletion Failed", ToastAndroid.SHORT);
                        }
                    },
                },
            ]
        );
    }

    const handleLogAdherence = async (medId: string, scheduledTime: string, status: 'taken' | 'skipped', notes: string) => {
        try {
            const res = await fetch(`${BASE_URL}/api/adherence/log`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "content-Type": "application/json"
                },
                body: JSON.stringify({
                    medication: medId,
                    scheduledTime,
                    logDate: selectedDate,
                    status,
                    notes: notes
                })
            });

            const result = await res.json();

            if (result.success) {
                ToastAndroid.show(`Medication marked as ${status}`, ToastAndroid.SHORT);

                if (getLocalDateString(selectedDate) === getLocalDateString(new Date())) {
                    await cancelMissedDoseNotification(medId, scheduledTime);
                }

                fetchMedications();
            } else {
                ToastAndroid.show(result.message || "Could not log action", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Adherence submit error: ", err);
            ToastAndroid.show("Server error", ToastAndroid.SHORT);
        }
    }

    // log medications that have no scheduled time (Most likely will never be triggered since we force schedule time when creating a medication)
    const handleLogPRNDose = async (medId: string, status: 'taken' | 'skipped', notes: string) => {
        const nowTime = new Date().toTimeString().slice(0, 8); // "HH:MM:SS"
        await handleLogAdherence(medId, nowTime, status, notes);
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={styles.body}>
                {/* Date selector */}
                <View style={styles.dateSelector}>
                    {/* Previous day */}
                    <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
                        <Text style={styles.dateNavText}>{"<"}</Text>
                    </TouchableOpacity>

                    {/* Current day, shows calendar when clicked */}
                    <Pressable onPress={() => setIsCalendarVisible(true)} style={styles.dateInfo}>
                        <Text style={styles.dateTitle}>{selectedDate.toDateString() === new Date().toDateString() ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: "long" })}</Text>
                        <Text style={styles.dateSubtitle}>{getLocalDateString(selectedDate)} ▾</Text>
                    </Pressable>

                    {/* Next day */}
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
                                    dotColor: "#2563EB",
                                }}
                            />
                        </View>
                    </View>
                </Modal>

                <Text style={styles.sectionTitle}>Medications for this day:</Text>

                {fetching ? (
                    // loader icon if medications not readdy
                    <ActivityIndicator color="#2563EB" />
                ) : (
                    // medication cards list
                    <FlatList
                        data={doseCards}
                        keyExtractor={(item) => item.doseKey}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item: doseCard }) => {
                            const { medication: item, scheduledTime: currentSlotTime, isPRN, doseKey } = doseCard;
                            const isExpanded = expandedId === doseKey;
                            const isLowStock = item.inventory?.trackingEnabled && ((item.inventory.currentQuantity ?? 0) <= (item.inventory.refillThreshold ?? 0));
                            const activeDay = getLocalDateString(new Date(selectedDate));

                            const existingLog = !isPRN
                                ? adherenceLogs.find(log => {
                                    const parsedLogDateStr = getLocalDateString(new Date(log.logDate));
                                    const loggedMedId = typeof log.medication === 'object' ? log.medication._id : log.medication;

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
                                <TouchableOpacity
                                    activeOpacity={0.6}
                                    onPress={() => toggleExpandedId(doseKey)}
                                    style={[styles.medCard, isExpanded && styles.expandedCard]}
                                >
                                    {/* Collapsed summary row */}
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

                                    {/* Expanded Block */}
                                    {isExpanded && (
                                        <View style={styles.detailsSection}>
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

                                            {/* Action buttons for logging compliance */}
                                            <View style={styles.actionRow}>
                                                <TouchableOpacity
                                                    style={[styles.baseButton, styles.takenButton, !isPRN && existingLog?.status === 'taken' && { opacity: 0.5 }]}
                                                    onPress={() => isPRN
                                                        ? handleLogPRNDose(item._id, 'taken', item.notes || "")
                                                        : handleLogAdherence(item._id, currentSlotTime, 'taken', item.notes || "")
                                                    }
                                                    disabled={!isPRN && existingLog?.status === 'taken'}
                                                >
                                                    <Text style={[styles.baseButtonText, styles.takenButtonText]}>Mark Taken</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.baseButton, styles.skipButton, !isPRN && existingLog?.status === 'skipped' && { opacity: 0.5 }]}
                                                    onPress={() => isPRN
                                                        ? handleLogPRNDose(item._id, 'skipped', item.notes || "")
                                                        : handleLogAdherence(item._id, currentSlotTime, 'skipped', item.notes || "")
                                                    } disabled={existingLog?.status === 'skipped'}
                                                >
                                                    <Text style={[styles.baseButtonText, styles.skipButtonText]}>Skip</Text>
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.cardActionContainer}>
                                                <TouchableOpacity
                                                    style={[styles.baseButton, styles.editButton]}
                                                    onPress={() => handleEditMedication(item)}
                                                >
                                                    <Text style={[styles.baseButtonText, styles.editButtonText]}>Edit</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.baseButton, styles.deleteButton]}
                                                    onPress={() => handleDeleteMedication(item._id)}
                                                >
                                                    <Text style={[styles.baseButtonText, styles.deleteButtonText]}>Delete</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No Medication scheduled for this day</Text>
                            </View>
                        }
                    />
                )}
            </View>

            <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 25 }]} onPress={() => router.push("/(patient)/addMedication")}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
    },
    medCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        elevation: 2,
    },
    expandedCard: {
        borderColor: "#2563EB",
        borderWidth: 1.5,
    },
    cardMainRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailsSection: {
        marginTop: 15,
    },
    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginBottom: 15,
    },
    detailLabel: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 4,
    },
    detailValue: {
        color: "#1F2937",
        fontWeight: "500",
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
    detailsGridRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    detailColumn: {
        flex: 1
    },
    lowStockText: {
        color: "#EF4444",
        fontWeight: "700",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40,
    },
    emptyText: {
        color: "#9CA3AF",
        fontSize: 15,
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

    // card buttons
    actionRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16,
        gap: 10,
    },
    cardActionContainer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        marginTop: 12,
        paddingTop: 12,
        gap: 10,
    },
    baseButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        borderWidth: 0,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1
    },
    baseButtonText: {
        fontSize: 14,
        fontWeight: "700",
    },
    takenButton: {
        backgroundColor: "#16A34A",
    },
    takenButtonText: {
        color: "#FFFFFF"
    },
    skipButton: {
        backgroundColor: "#EA580C",
    },
    skipButtonText: {
        color: "#FFFFFF"
    },
    editButton: {
        backgroundColor: "#2563EB",
    },
    editButtonText: {
        color: "#FFFFFF",
    },
    deleteButton: {
        backgroundColor: "#DC2626",
    },
    deleteButtonText: {
        color: "#FFFFFF",
    },
    fab: {
        position: "absolute",
        right: 24,
        backgroundColor: "#2563EB",
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        elevation: 6
    },
    fabText: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "300",
    }
});