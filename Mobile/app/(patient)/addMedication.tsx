import { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, Pressable, Keyboard } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";
import { scheduleAndStoreNotifications, cancelMedicationReminders } from "../../utils/notifications";
import { getLocalDateString } from "@/utils/dates";

export default function AddMedication() {
    const { user } = useAuth();

    // margin top under iphone dynamic island
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
        // if we are editing an existing med, fill inputs with med details
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

    //
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

    // add time to times list
    const addTimeToGrid = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const newTime = `${hours}:${minutes}`;

        // add time only if it doesn't previously exist in times list
        if (!times.includes(newTime)) {
            setTimes([...times, newTime].sort());
        }
    }

    // remove time from times list
    const removeTime = (timeToRemove: string) => {
        setTimes(times.filter(t => t !== timeToRemove));
    }

    // when start date is selected, save it in state and hide the timePicker
    const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowStartDatePicker(false);
        if (selectedDate) {
            setStartDate(selectedDate);

            // start date can't be higher than end date
            if (selectedDate > endDate) {
                setEndDate(selectedDate)
            }
        }
    }

    // when end date is selected, save it in state and hide the timePicker
    const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowEndDatePicker(false);
        if (selectedDate) {
            // end date can't be lower than start
            if (selectedDate >= startDate) {
                setEndDate(selectedDate);
            }
            else {
                alert("End Date cannot be before start date");
            }
        }
    }

    // create or edit a new medication
    const handleAddMedication = async () => {
        try {
            // select the corresponding URL and method depending on the action taken(create or edit medication)
            const url = isEditing ? `${BASE_URL}/api/medications/${editMed._id}` : `${BASE_URL}/api/medications`;
            const method = isEditing ? "PUT" : "POST";

            // save changes to database
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user.token}`,
                },
                body: JSON.stringify({ name, dosage, frequency: Number(frequency), times, startDate: getLocalDateString(startDate), endDate: getLocalDateString(endDate), notes, }),
            });

            const result = await response.json();

            // notification logic then go back to dashboard if action is successful
            if (response.ok) {
                // if editing clear existing notifications for this med
                if (isEditing) {
                    await cancelMedicationReminders(editMed._id);
                    await fetch(`${BASE_URL}/api/notifications/medication/${editMed._id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${user.token}` }
                    });
                }

                // convert string times ["8:30", "20:00"] to {hour, minute} objects
                const formattedTimes = times.map(t => {
                    const [hour, minute] = t.split(':').map(Number);
                    return { hour, minute };
                });

                // schedule new notifications
                const medId = isEditing ? editMed._id : (result.data?._id || result._id);

                for (const time of formattedTimes) {
                    // schedule locally and get local _id
                    const scheduleIds = await scheduleAndStoreNotifications(medId, name, [time]);
                    const localId = scheduleIds[0];

                    // calculate the exact date for ScheduleFor
                    const scheduledDate = new Date(startDate);
                    scheduledDate.setHours(time.hour, time.minute, 0, 0);

                    // save to mongoDB notifications model
                    await fetch(`${BASE_URL}/api/notifications`, {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${user.token}`,
                        },
                        body: JSON.stringify({
                            medication: medId,
                            title: "Pill reminder 💊",
                            message: `It's time to take your ${name}`,
                            scheduledFor: getLocalDateString(scheduledDate),
                            dateString: getLocalDateString(scheduledDate),
                            scheduledTime: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
                            localNotificationId: localId
                        }),
                    });
                }

                router.back();
            }
            else {
                alert(result.message || "Failed to add medication");
            }
        } catch (err) {
            console.error("Add medication error: ", err);
        }
    };

    // clear inputs when clicking cancel button
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
            {/* page title depending on action taken (create or edit medication) */}
            <Text style={styles.title}>{isEditing ? "Edit Medication" : "Add Medication"}</Text>

            {/* form inputs */}
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
                    // times element with delete button
                    <TouchableOpacity key={time} style={styles.timeChip} onPress={() => removeTime(time)}>
                        <Text style={styles.timeChipText}>{time}  x</Text>
                    </TouchableOpacity>
                ))}

                {/* add time button */}
                <TouchableOpacity style={styles.addTimeButton} onPress={() => { Keyboard.dismiss(); setShowTimePicker(true) }}>
                    <Text style={styles.addTimeText}>+ Add time</Text>
                </TouchableOpacity>
            </View>

            {/* timePicker to fill times array */}
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

            {/* time picker for start date */}
            {showStartDatePicker && (
                <DateTimePicker style={{ marginBottom: 10 }} value={startDate} mode="date" onChange={handleStartDateChange} />
            )}

            <Text style={styles.label}>End Date</Text>
            <Pressable style={styles.input} onPress={() => setShowEndDatePicker(true)}>
                <Text style={{ color: "#000" }}>{endDate.toLocaleDateString()}</Text>
            </Pressable>

            {/* time picker for end date */}
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
                {/* save button */}
                <TouchableOpacity style={styles.addButton} onPress={handleAddMedication}>
                    <Text style={styles.addButtonText}>{isEditing ? "Edit Medication" : "Add Medication"}</Text>
                </TouchableOpacity>

                {/* cancel button */}
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
    addButtonText: {
        color: "#FFF",
        fontWeight: "bold"
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
        fontWeight: "bold"
    }
});