import { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Modal, ToastAndroid } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";
import { getLocalDateString } from "../../utils/dates";

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

export default function AddMedication() {
    const { user } = useAuth();

    const params = useLocalSearchParams();
    const editMed = useMemo(() => {
        return params.medication ? JSON.parse(params.medication as string) : null;
    }, [params.medication]);

    const isEditing = !!editMed;

    const [name, setName] = useState("");
    const [type, setType] = useState<Medication['type']>('tablet');
    const [dosage, setDosage] = useState<Medication['dosage']>({ value: 0, unit: 'mg' });
    const [frequency, setFrequency] = useState<Medication['frequency']['type']>('daily');
    const [specificDays, setSpecificDays] = useState<Medication['frequency']['specificDays']>([]);
    const [intervalDays, setIntervalDays] = useState(1);
    const [schedule, setSchedule] = useState<Medication['schedule']>([]);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [trackingEnabled, setTrackingEnabled] = useState(false);
    const [currentQuantity, setCurrentQuantity] = useState(0);
    const [refillThreshold, setRefillThreshold] = useState(5);
    const [lastRefilledDate, setLastRefilledDate] = useState<Date | null>(null);
    const [instructions, setInstructions] = useState<Medication['instructions']>('no preference');
    const [doctorName, setDoctorName] = useState("");
    const [doctorPhone, setDoctorPhone] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [notes, setNotes] = useState("");

    const [isUnitDropdownVisible, setIsUnitDropdownVisible] = useState(false);
    const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    const [isStartDatePickerVisible, setIsStartDatePickerVisible] = useState(false);
    const [isEndDatePickerVisible, setIsEndDatePickerVisible] = useState(false);

    useEffect(() => {
        if (isEditing && editMed) {
            setName(editMed.name);
            setType(editMed.type);
            setDosage({ value: editMed.dosage.value, unit: editMed.dosage.unit });
            setFrequency(editMed.frequency.type);
            setSpecificDays(editMed.frequency.specificDays || []);
            setIntervalDays(editMed.frequency.intervalDays || 1);
            setSchedule(editMed.schedule || []);
            setStartDate(editMed.startDate);
            setEndDate(editMed.endDate || null);
            setTrackingEnabled(editMed.inventory.trackingEnabled);
            setCurrentQuantity(editMed.inventory.currentQuantity || 0);
            setRefillThreshold(editMed.inventory.refillThreshold || 5);
            setLastRefilledDate(editMed.inventory.lastRefilledDate || null);
            setInstructions(editMed.instructions);
            setDoctorName(editMed.doctor?.name || "");
            setDoctorPhone(editMed.doctor?.phone || "");
            setIsActive(editMed.isActive);
            setNotes(editMed.notes || "");

            if (editMed.trackingEnabled || editMed.doctor?.name || editMed.notes) {
                setIsAdvancedVisible(true);
            }
        }
    }, [isEditing, editMed]);

    const handleAddMedication = async () => {
        if (!name) {
            ToastAndroid.show("Name is required", ToastAndroid.SHORT);
            return;
        }

        if (dosage.value < 0) {
            ToastAndroid.show("Provide a valid dosage value", ToastAndroid.SHORT);
            return;
        }

        if (frequency === "specific days" && !specificDays) {
            ToastAndroid.show("Please provide at least one day", ToastAndroid.SHORT);
            return;
        }

        if (schedule.length === 0) {
            ToastAndroid.show("Please add at least one reminder", ToastAndroid.SHORT);
            return;
        }

        try {
            const cleanStartDate = getLocalDateString(new Date(startDate));

            let cleanEndDate: string | null = null;
            if (endDate) {
                cleanEndDate = getLocalDateString(new Date(endDate));
            }

            const parsedCurrentQuantity = currentQuantity ? Number(currentQuantity) : 0;
            const parsedRefillThreshold = refillThreshold ? Number(refillThreshold) : 0;
            const payload: any = {
                name: name.trim(),
                type,
                dosage: {
                    value: dosage.value,
                    unit: dosage.unit,
                },
                frequency: {
                    type: frequency,
                    ...(frequency === "specific days" && { specificDays }),
                    ...(frequency === "interval" && { intervalDays: Number(intervalDays) })
                },
                schedule,
                startDate: cleanStartDate,
                endDate: cleanEndDate,
                inventory: {
                    trackingEnabled: trackingEnabled,
                    currentQuantity: trackingEnabled ? parsedCurrentQuantity : undefined,
                    refillThreshold: trackingEnabled ? parsedRefillThreshold : undefined,
                    lastRefilledDate: (trackingEnabled && lastRefilledDate) ? getLocalDateString(new Date(lastRefilledDate)) : undefined,
                },
                instructions,
                isActive,
                notes: notes.trim() || undefined
            };

            if (doctorName?.trim() || doctorPhone?.trim()) {
                payload.doctor = {
                    name: doctorName.trim(),
                    phone: doctorPhone.trim()
                };
            } else {
                payload.doctor = undefined;
            }

            // select the corresponding URL and method depending on the action taken (create or edit medication)
            const url = isEditing ? `${BASE_URL}/api/medications/${editMed._id}` : `${BASE_URL}/api/medications`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success) {
                ToastAndroid.show(isEditing ? "Medication updated successfully" : "Medication created successfully", ToastAndroid.SHORT);
                router.back();
            }
            else {
                ToastAndroid.show(result.message || "an error occurred", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Failed to save medication: ", err);
            ToastAndroid.show("Server error, try again", ToastAndroid.SHORT);
        }
    }

    const handleCancel = () => {
        router.back();
    }

    // add medication times
    const handleTimeChange = (event: any, selectedTime: Date) => {
        setIsTimePickerVisible(false);

        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            const formattedTime = `${hours}:${minutes}`;

            setSchedule(prev => {
                if (prev.some(item => item.time === formattedTime)) {
                    return prev;
                }

                const updated = [...prev, { time: formattedTime }];
                return updated.sort((a, b) => a.time.localeCompare(b.time));
            });
        }
    }

    // save Start Date in state and hide time picker
    const handleStartDateChange = (event: any, selectedDate?: Date) => {
        setIsStartDatePickerVisible(false);
        if (selectedDate) {
            setStartDate(selectedDate);
            // start date can't be higher than end date
            if (endDate && selectedDate > endDate) {
                setEndDate(selectedDate);
            }
        }
    }

    // save end Date in state and hide time picker
    const handleEndDateChange = (event: any, selectedDate?: Date) => {
        setIsEndDatePickerVisible(false);
        if (selectedDate) {
            // end date can't be lower than end date
            if (selectedDate >= startDate) {
                setEndDate(selectedDate);
            } else {
                ToastAndroid.show("End date cannot be before start date", ToastAndroid.SHORT);
            }
        }
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>{isEditing ? "Edit" : "Add New"} Medication</Text>

            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Panadol"
                placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Medication Type *</Text>
            <View style={styles.selectorGrid}>
                {(['tablet', 'capsule', 'liquid', 'injection', 'inhaler', 'cream', 'other'] as const).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.selectorChip, type === t && styles.selectorChipActive]}
                        onPress={() => setType(t)}
                    >
                        <Text style={[styles.selectorText, type === t && styles.selectorTextActive]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.inlineRow}>
                <View style={[styles.inlineColumn, { flex: 1.5 }]}>
                    <Text style={styles.label}>Dosage Value *</Text>
                    <TextInput
                        style={styles.input}
                        value={dosage.value === 0 ? "" : dosage.value.toString()}
                        onChangeText={(val) => setDosage(prev => ({ ...prev, value: Number(val) || 0 }))}
                        placeholder="e.g. 20, 500"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.inlineColumn}>
                    <Text style={styles.label}>Unit *</Text>
                    <TouchableOpacity
                        style={styles.dropdownSelectorBox}
                        activeOpacity={0.7}
                        onPress={() => setIsUnitDropdownVisible(true)}
                    >
                        <Text style={styles.dropdownSelectorText}>{dosage.unit}</Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    visible={isUnitDropdownVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setIsUnitDropdownVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.contentCloser}
                            activeOpacity={1}
                            onPress={() => setIsUnitDropdownVisible(false)}
                        />
                        <View style={styles.dropdownContainer}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownHeaderTitle}>Select Unit</Text>
                            </View>
                            <ScrollView bounces={false} style={styles.dropdownScroll}>
                                {(['mg', 'mcg', 'ml', 'drops', 'puffs', 'units'] as const).map((u) => (
                                    <TouchableOpacity
                                        key={u}
                                        style={[styles.dropdownItem, dosage.unit === u && styles.dropdownItemActive]}
                                        onPress={() => {
                                            setDosage(prev => ({ ...prev, unit: u }));
                                            setIsUnitDropdownVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, dosage.unit === u && styles.dropdownItemTextActive]}>{u}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>

            <Text style={styles.label}>Frequency Type *</Text>
            <View style={styles.selectorGrid}>
                {(['daily', 'specific days', 'as needed (PRN)', 'interval'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.selectorChip, frequency === f && styles.selectorChipActive]}
                        onPress={() => setFrequency(f)}
                    >
                        <Text style={[styles.selectorText, frequency === f && styles.selectorTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {frequency === 'specific days' && (
                <View>
                    <Text style={styles.label}>Select Scheduled Days *</Text>
                    <View style={styles.selectorGrid}>
                        {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                            const isSelected = specificDays?.includes(day);
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                                    onPress={() => {
                                        if (isSelected) {
                                            setSpecificDays(prev => prev?.filter(d => d !== day));
                                        } else {
                                            setSpecificDays(prev => [...(prev ?? []), day])
                                        }
                                    }}
                                >
                                    <Text style={[styles.selectorText, isSelected && styles.selectorTextActive]}>{day.substring(0, 3)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {frequency === 'interval' && (
                <View>
                    <Text style={styles.label}>Repeat Every (Days) *</Text>
                    <TextInput
                        style={styles.input}
                        value={intervalDays.toString()}
                        onChangeText={(val) => setIntervalDays(Number(val) || 1)}
                        placeholder="e.g. 3 for once every 3 days"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                    />
                </View>
            )}

            <Text style={styles.label}>Dose Reminder Times *</Text>
            <View style={styles.timesContainer}>
                {schedule.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.timeChip}
                        onPress={() => setSchedule(prev => prev.filter((_, i) => i !== index))}
                    >
                        <Text style={styles.timeChipText}>{item.time} X</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addTimeButton} onPress={() => setIsTimePickerVisible(true)}>
                    <Text style={styles.addTimeText}>+ Add Time</Text>
                </TouchableOpacity>
            </View>

            {isTimePickerVisible && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour={true}
                    onValueChange={handleTimeChange}
                    onDismiss={() => setIsTimePickerVisible(false)}
                />
            )}

            <View style={styles.inlineRow}>
                <View style={styles.inlineColumn}>
                    <Text style={styles.label}>Start Date *</Text>
                    <TouchableOpacity style={styles.dateSelectorBox} onPress={() => setIsStartDatePickerVisible(true)}>
                        <Text style={styles.dateSelectorText}>{getLocalDateString(new Date(startDate))}</Text>
                    </TouchableOpacity>
                </View>

                {isStartDatePickerVisible && (
                    <DateTimePicker
                        value={new Date(startDate)}
                        mode="date"
                        onValueChange={handleStartDateChange}
                        onDismiss={() => setIsStartDatePickerVisible(false)}
                        onNeutralButtonPress={() => setIsStartDatePickerVisible(false)}
                    />
                )}

                <View style={styles.inlineColumn}>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity style={styles.dateSelectorBox} onPress={() => setIsEndDatePickerVisible(true)}>
                        <Text style={styles.dateSelectorText}>{endDate ? getLocalDateString(new Date(endDate)) : "set End Date"}</Text>
                    </TouchableOpacity>
                </View>

                {isEndDatePickerVisible && (
                    <DateTimePicker
                        value={endDate ? new Date(endDate) : new Date()}
                        mode="date"
                        onValueChange={handleEndDateChange}
                        onDismiss={() => setIsEndDatePickerVisible(false)}
                        onNeutralButtonPress={() => setIsEndDatePickerVisible(false)}
                    />
                )}
            </View>

            <TouchableOpacity
                style={styles.advancedToggleButton}
                activeOpacity={0.7}
                onPress={() => setIsAdvancedVisible(!isAdvancedVisible)}
            >
                <Text style={styles.advancedToggleText}>Advanced Settings</Text>
                <Text style={styles.advancedToggleChevron}>{isAdvancedVisible ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {isAdvancedVisible && (
                <View style={styles.advancedSectionContainer}>
                    <Text style={styles.label}>Instructions</Text>
                    <View style={styles.selectorGrid}>
                        {(['before food', 'with food', 'after food', 'empty stomach', 'no preference'] as const).map((ins) => (
                            <TouchableOpacity
                                key={ins}
                                style={[styles.selectorChip, instructions === ins && styles.selectorChipActive]}
                                onPress={() => setInstructions(ins)}
                            >
                                <Text style={[styles.selectorText, instructions === ins && styles.selectorTextActive]}>{ins}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>Track Pill Inventory</Text>
                        <Switch
                            trackColor={{ false: "#D1D5DB", true: "#BFDBFE" }}
                            thumbColor={trackingEnabled ? "#2563EB" : "#F3F4F6"}
                            value={trackingEnabled}
                            onValueChange={setTrackingEnabled}
                        />
                    </View>

                    {trackingEnabled && (
                        <View style={styles.inlineRow}>
                            <View style={styles.inlineColumn}>
                                <Text style={styles.label}>Current Quantity</Text>
                                <TextInput
                                    style={styles.input}
                                    value={currentQuantity.toString()}
                                    onChangeText={(val) => setCurrentQuantity(Number(val) || 0)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.inlineColumn}>
                                <Text style={styles.label}>Refill Alert Limit</Text>
                                <TextInput
                                    style={styles.input}
                                    value={refillThreshold.toString()}
                                    onChangeText={(val) => setRefillThreshold(Number(val) || 0)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    )}

                    <Text style={styles.label}>Prescribing Doctor Name</Text>
                    <TextInput
                        style={styles.input}
                        value={doctorName}
                        onChangeText={dr => setDoctorName(dr)}
                        placeholder="Dr. John Doe"
                        placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.label}>Doctor contact Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={doctorPhone}
                        onChangeText={dr => setDoctorPhone(dr)}
                        placeholder="+961 70 123 456"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                    />

                    <View style={styles.toggleRow}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>Active medication</Text>
                        <Switch
                            trackColor={{ false: "#D1D5DB", true: "#BFDBFE" }}
                            thumbColor={isActive ? "#2563EB" : "#F3F4F6"}
                            value={isActive}
                            onValueChange={setIsActive}
                        />
                    </View>

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        placeholder="Special notes or instructions (optional)"
                        placeholderTextColor="#9CA3AF"
                        value={notes}
                        onChangeText={setNotes}
                        style={[styles.input, styles.textArea]}
                        numberOfLines={3}
                    />
                </View>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                    <Text style={styles.addButtonText}>{isEditing ? "Save" : "Create Schedule"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#1F2937",
        textAlign: "center",
        paddingTop: 10
    },
    label: {
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 6,
        marginLeft: 2,
        fontWeight: "600",
    },
    input: {
        backgroundColor: "#FFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        color: "#000",
        fontSize: 15
    },
    selectorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14
    },
    selectorChip: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    selectorChipActive: {
        backgroundColor: "#EFF6FF",
        borderColor: "#2563EB"
    },
    selectorText: {
        color: "#4B5563",
        fontWeight: "500",
        fontSize: 13,
        textTransform: 'capitalize'
    },
    selectorTextActive: {
        color: "#2563EB",
        fontWeight: "700",
    },
    inlineRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 14
    },
    inlineColumn: {
        flex: 1
    },
    dropdownSelectorBox: {
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dropdownSelectorText: {
        fontSize: 15,
        color: "#1F2937",
    },
    dropdownArrow: {
        color: "#9CA3AF",
        fontSize: 11,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "#00000050",
        justifyContent: "center",
        paddingHorizontal: 30,
    },
    contentCloser: {
        ...StyleSheet.absoluteFill,
    },
    dropdownContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        maxHeight: 350,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        overflow: "hidden"
    },
    dropdownHeader: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: "#F9FAFB",
    },
    dropdownHeaderTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151"
    },
    dropdownScroll: {
        paddingVertical: 4
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "#FFFFFF"
    },
    dropdownItemActive: {
        backgroundColor: "#EFF6FF"
    },
    dropdownItemText: {
        fontSize: 15,
        color: "#4B5563"
    },
    dropdownItemTextActive: {
        color: "#2563EB",
        fontWeight: "700"
    },
    dateSelectorBox: {
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    dateSelectorText: {
        color: "#1F2937",
        fontSize: 15,
    },
    timesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 14,
        alignItems: "center"
    },
    timeChip: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    timeChipText: {
        color: "#374151",
        fontWeight: "600",
    },
    addTimeButton: {
        borderWidth: 1,
        borderColor: "#2563EB",
        borderStyle: "dashed",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    addTimeText: {
        color: "#2563EB",
        fontWeight: "bold",
    },
    advancedToggleButton: {
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 6,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    advancedToggleText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151"
    },
    advancedToggleChevron: {
        fontSize: 12,
        color: "#6B7280",
    },
    advancedSectionContainer: {
        backgroundColor: "#FFFFFF",
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 14
    },
    toggleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    textArea: {
        height: 80,
        textAlignVertical: "top",
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 10
    },
    addButton: {
        flex: 1,
        backgroundColor: "#2563EB",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
    },
    addButtonText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 15
    },
    cancelButton: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    cancelButtonText: {
        color: "#4B5563",
        fontWeight: "bold",
        fontSize: 15
    }
});