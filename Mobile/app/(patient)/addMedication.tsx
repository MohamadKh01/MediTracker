import { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, Pressable, Keyboard } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";

export default function AddMedication() {
    const { user } = useAuth();

    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams();
    const editMed = useMemo(() => {
        return params.medication ? JSON.parse(params.medication as string) : null;
    }, [params.medication]);
    const isEditing = !!editMed;

    const [name, setName] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequency, setFrequency] = useState("");
    const [times, setTimes] = useState<string[]>([]);
    const [tempTime, setTempTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false)
    const [endDate, setEndDate] = useState(new Date());
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (isEditing && editMed) {
            setName(editMed.name);
            setDosage(editMed.dosage);
            setFrequency(editMed.frequency.toString());
            setTimes(editMed.times || []);
            setStartDate(new Date(editMed.startDate));
            setEndDate(new Date(editMed.endDate));
            setNotes(editMed.notes || "");
        }
    }, [isEditing, editMed]);

    const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowTimePicker(false);
            if (selectedDate) {
                addTimeToGrid(selectedDate);
            }
        }
        else {
            if (selectedDate) {
                setTempTime(selectedDate);
            }
        }
    }

    const addTimeToGrid = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const newTime = `${hours}:${minutes}`;

        if (!times.includes(newTime)) {
            setTimes([...times, newTime].sort());
        }
    }

    const removeTime = (timeToRemove: string) => {
        setTimes(times.filter(t => t !== timeToRemove));
    }

    const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);

            if (selectedDate > endDate) {
                setEndDate(selectedDate)
            }
        }
    }

    const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            if (selectedDate >= startDate) {
                setEndDate(selectedDate);
            }
            else {
                alert("End Date cannot be before start date");
            }
        }
    }

    const handleAddMedication = async () => {
        try {
            const url = isEditing ? `${BASE_URL}/api/medications/${editMed._id}` : `${BASE_URL}/api/medications`;

            const method = isEditing ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ name, dosage, frequency: Number(frequency), times, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0], notes, }),
            });

            const result = await response.json();

            if (response.ok) {
                router.back();
            }
            else {
                alert(result.message || "Failed to add medication");
            }
        } catch (err) {
            console.error("Add medication error: ", err);
        }
    };

    const handleCancel = () => {
        setName("");
        setDosage("");
        setFrequency("");
        setTimes([]);
        setStartDate(new Date());
        setEndDate(new Date());
        setNotes("");
        router.back();
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Text style={styles.title}>{isEditing ? "Edit Medication" : "Add Medication"}</Text>

            <TextInput
                placeholder="Medication name"
                placeholderTextColor="#7d7c7c"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />

            <TextInput
                placeholder="Dosage (e.g. 50mg)"
                placeholderTextColor="#7d7c7c"
                value={dosage}
                onChangeText={setDosage}
                style={styles.input}
            />

            <TextInput
                placeholder="Frequency (times per day)"
                placeholderTextColor="#7d7c7c"
                value={frequency}
                onChangeText={setFrequency}
                keyboardType="numeric"
                style={styles.input}
            />

            <Text style={styles.label}>Medication Times: </Text>
            <View style={styles.timesContainer}>
                {times.map((time) => (
                    <TouchableOpacity key={time} style={styles.timeChip} onPress={() => removeTime(time)}>
                        <Text style={styles.timeChipText}>{time}  x</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.addTimeButton} onPress={() => { Keyboard.dismiss(); setShowTimePicker(true) }}>
                    <Text style={styles.addTimeText}>+ Add time</Text>
                </TouchableOpacity>
            </View>

            {showTimePicker && (
                Platform.OS === "ios" ? (
                    <View style={styles.iosModalWrapper}>
                        <View style={styles.iosModalContent}>
                            <View style={styles.iosModalHeader}>
                                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                                    <Text style={{ color: 'red' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    addTimeToGrid(tempTime);
                                    setShowTimePicker(false);
                                }}>
                                    <Text style={{ color: "#2563EB", fontWeight: "bold" }}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempTime}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
                                onChange={handleTimeChange}
                                textColor="#000000"
                                themeVariant="light"
                            />
                        </View>
                    </View>
                ) : (
                    <DateTimePicker
                        value={new Date()}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={handleTimeChange}
                    />
                )
            )}

            <Text style={styles.label}>Start Date</Text>
            <Pressable style={styles.input} onPress={() => setShowStartDatePicker(true)}>
                <Text style={{ color: "#000" }}>{startDate.toLocaleDateString()}</Text>
            </Pressable>
            {showStartDatePicker && (
                <DateTimePicker style={{ marginBottom: 10 }} value={startDate} mode="date" onChange={handleStartDateChange} />
            )}

            <Text style={styles.label}>End Date</Text>
            <Pressable style={styles.input} onPress={() => setShowEndDatePicker(true)}>
                <Text style={{ color: "#000" }}>{endDate.toLocaleDateString()}</Text>
            </Pressable>
            {showEndDatePicker && (
                <DateTimePicker style={{ marginBottom: 10 }} value={endDate} mode="date" minimumDate={startDate} onChange={handleEndDateChange} />
            )}

            <TextInput
                placeholder="Notes"
                placeholderTextColor="#7d7c7c"
                value={notes}
                onChangeText={setNotes}
                style={styles.input}
            />

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                    <Text style={styles.addButtonText}>{isEditing ? "Edit Medication" : "Add Medication"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#F9FAFB"
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20
    },
    input: {
        backgroundColor: "#FFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB"
    },
    label: {
        fontSize: 14,
        color: "#4B5563",
        marginBottom: 4,
        marginLeft: 4,
    },
    timesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    timeChip: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
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
    iosModalWrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        top: 0,
        justifyContent: "flex-end",
        zIndex: 1000,
    },
    iosModalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        alignItems: "center",
        justifyContent: "center"
    },
    iosModalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
        width: "100%",
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20
    },
    addButton: {
        flex: 1,
        backgroundColor: "#2563EB",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center"
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
    addButtonText: {
        color: "#FFF",
        fontWeight: "bold"
    },
    cancelButtonText: {
        color: "#4B5563",
        fontWeight: "bold"
    }
});