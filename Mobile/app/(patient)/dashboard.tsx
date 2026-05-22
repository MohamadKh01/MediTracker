import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Pressable, Modal, DeviceEventEmitter, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Calendar } from "react-native-calendars";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";
import { cancelMedicationReminders } from "../../utils/notifications";
import { getLocalDateString } from "@/utils/dates";
import Header from '../../components/Header';

// structure of Medication object
interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: number;
  times: string[];
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export default function PatientDashboard() {
  const { user, isLoading, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  // medications of the current user
  const [medications, setMedications] = useState<Medication[]>([]);
  // boolean for "are we still getting medications from database?"
  const [fetching, setFetching] = useState(true);
  // current day for which we are showing meds on dashboard
  const [selectedDate, setSelectedDate] = useState(new Date());
  // med id of the expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // state of the calendar visibility
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  // state to log taken doses
  const [takenDoses, setTakenDoses] = useState<any[]>([]);

  // Read incoming navigation params
  const { expandMedicationId } = useLocalSearchParams<{ expandMedicationId?: string }>();

  useFocusEffect(
    useCallback(() => {
      if (expandMedicationId) {
        const timer = setTimeout(() => {
          setExpandedId(expandMedicationId);
          router.setParams({ expandedMedicationId: undefined });
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [expandMedicationId])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("medicationTaken", () => {
      fetchMedications();
    });
    return () => subscription.remove();
  }, [selectedDate]);

  // fetch meds every time dashboard becomes the active screen
  useFocusEffect(
    useCallback(() => {
      if (!isLoading && user) {
        fetchMedications();;
      }
    }, [isLoading, user, selectedDate])
  );

  // fetch the current user's medication from database
  const fetchMedications = async () => {
    try {
      const dateStr = getLocalDateString(selectedDate);

      const [medRes, logRes] = await Promise.all([
        fetch(`${BASE_URL}/api/medications`, { headers: { Authorization: `Bearer ${user?.token}` } }),
        fetch(`${BASE_URL}/api/adherence/${dateStr}`, { headers: { Authorization: `Bearer ${user?.token}` } })
      ]);

      const medResult = await medRes.json();
      const logResult = await logRes.json();

      // save medications in state if fetching is successful
      if (medResult.success) {
        setMedications(medResult.data);
      }

      if (logResult.success) {
        setTakenDoses(logResult.data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleToggleDose = async (medId: string, time: string) => {
    const dateStr = getLocalDateString(selectedDate);
    const previousLogs = [...takenDoses];

    setTakenDoses((current) => {
      const exists = current.find(l => l.medication === medId && l.scheduledTime === time);
      if (exists) {
        return current.filter(l => l !== exists);
      }
      return [...current, { medication: medId, scheduledTime: time, dateString: dateStr }];
    });

    try {
      const response = await fetch(`${BASE_URL}/api/adherence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          medicationId: medId,
          dateString: dateStr,
          scheduledTime: time,
          status: "taken"
        })
      });

      if (!response.ok) {
        throw new Error();
      }
    }
    catch (err) {
      setTakenDoses(previousLogs);
      alert("Sync failed. please check your connection.");
    }
  };

  // delete a medication form database
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Medication",
      "Are you sure you want to delete this medication? this will also cancel all reminders!",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const url = `${BASE_URL}/api/medications/${id}`;
              const response = await fetch(url, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${user?.token}`,
                  "Content-Type": "application/json"
                }
              });

              // remove medication from state and remove notifications if deletion successful
              if (response.ok) {
                await cancelMedicationReminders(id);
                await fetch(`${BASE_URL}/api/notifications/medication/${id}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${user?.token}` }
                });
                setMedications((prev) => prev.filter((med) => med._id !== id));
                alert("Med deleted");
              }
              else {
                const res = await response.json();
                alert(res.message || "medication not deleted");
              }
            } catch (err) {
              console.error("Fetch error: ", err);
              alert("failed to delete");
            }
          },
        },
      ]
    );
  };

  // save the id of the medication card we want to expand
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  }

  // Helper to shift date
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  }

  // Filter medication for the selected day
  const filterMedications = medications.filter(med => {
    if (!med.startDate) {
      return false;
    }

    const start = new Date(med.startDate);
    const end = med.endDate ? new Date(med.endDate) : null;
    const current = new Date(selectedDate);
    current.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    if (end) {
      end.setHours(0, 0, 0, 0);
    }
    return current >= start && (!end || current <= end);
  });

  // generate marked dates for the calendar
  const markedDates = useMemo(() => {
    const marks: any = {};

    // marl the selected date as a solid blue circle
    const selectedStr = getLocalDateString(selectedDate);
    marks[selectedStr] = { selected: true, selectedColor: "#2563EB" };

    // add dots for dates with medications
    medications.forEach(med => {
      const start = new Date(med.startDate);
      const end = med.endDate ? new Date(med.endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);

      let current = new Date(start);
      let safetyCounter = 0;

      while (current <= end && safetyCounter < 365) {
        const dateString = getLocalDateString(current);
        if (!marks[dateString]) {
          marks[dateString] = { marked: true, dotColor: "#2563EB" };
        }
        else {
          marks[dateString] = { ...marks[dateString], marked: true, dotColor: "#2563EB" };
        }
        current.setDate(current.getDate() + 1);
        safetyCounter++;

        // limit to 1 year
        if (current > new Date(new Date().setFullYear(new Date().getFullYear() + 1))) {
          break;
        }
      }
    });
    return marks;
  }, [medications, selectedDate]);

  // show a blank page with loader icon if user doesn't exist or user role is not a patient
  if (isLoading || !user || user.role !== "patient") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header user={user} signOut={signOut} />

      {/* BODY */}
      <View style={styles.body}>
        {/* Date selector */}
        <View style={styles.dateSelector}>
          {/* previous day button */}
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNavButton}>
            <Text style={styles.dateNavText}>{"<"}</Text>
          </TouchableOpacity>

          {/* current day, show calendar when clicked */}
          <Pressable onPress={() => setIsCalendarVisible(true)} style={styles.dateInfo}>
            <Text style={styles.dateTitle}>{selectedDate.toDateString() === new Date().toDateString() ? "Today" : selectedDate.toLocaleDateString('en-US', { weekday: "long" })}</Text>
            <Text style={styles.dateSubtitle}>{getLocalDateString(selectedDate)} ▾</Text>
          </Pressable>

          {/* next day button */}
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

        <Text style={styles.sectionTitle}>Medications for this day: </Text>

        {fetching ? (
          // loader icon if medications not ready
          <ActivityIndicator color="#2563EB" />
        ) : (
          // list showing medication cards
          <FlatList data={filterMedications} keyExtractor={(item) => item._id} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} renderItem={({ item }) => {
            // boolean to check if the current medication is the one we want to expand
            const isExpanded = expandedId === item._id;

            return (
              // expand medication when clicked
              <Pressable
                onPress={() => toggleExpand(item._id)}
                style={[styles.medCard, isExpanded && styles.expandedCard]}
              >
                {/* Always visible section of the card */}
                <View style={styles.cardMainRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.name}</Text>
                    <Text style={styles.medSubtext}>{item.dosage}</Text>
                  </View>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{item.times && item.times.length > 0 ? item.times[0] : "No time"}{item.times.length > 1 && ` (+${item.times.length - 1})`}</Text>
                  </View>
                </View>

                {/* Hidden section of the card, shown when card is expanded*/}
                {isExpanded && (
                  <View style={styles.detailsSection}>
                    <View style={styles.divider} />

                    <Text style={styles.detailLabel}>Frequency: <Text style={styles.detailValue}>{item.frequency}x daily</Text></Text>

                    <Text style={[styles.detailLabel, { marginTop: 10 }]}>Track Doses:</Text>
                    <View style={styles.checkboxGrid}>
                      {item.times.map((time) => {
                        // check medication id, day, and time slot
                        const isTaken = takenDoses.some(log => {
                          const logMedId = typeof log.medication === 'object' ? log.medication._id : log.medication;
                          const medMatch = String(logMedId) === String(item._id);
                          const dateMatch = log.dateString === getLocalDateString(selectedDate);
                          const timeMatch = log.scheduledTime === time;

                          return medMatch && dateMatch && timeMatch;
                        });

                        return (
                          <TouchableOpacity
                            key={time}
                            style={styles.checkboxRow}
                            onPress={() => handleToggleDose(item._id, time)}
                          >
                            <View style={[styles.checkbox, isTaken && styles.checkboxChecked]}>
                              {isTaken && <Text style={styles.checkMark}>✓</Text>}
                            </View>
                            <Text style={styles.checkboxLabel}>{time}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {item.notes && (
                      <Text style={[styles.detailLabel, { marginTop: 10 }]}>Notes: <Text style={styles.detailValue}>{item.notes}</Text></Text>
                    )}

                    <View style={styles.actionRow}>
                      {/* edit medication button */}
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => router.push({
                          pathname: "/(patient)/addMedication",
                          params: { medication: JSON.stringify(item) }
                        })}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>

                      {/* delete medication button */}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(item._id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
            ListEmptyComponent={
              // show a message when user have no medications
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No medications scheduled.</Text>
              </View>
            } />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 16 }]} onPress={() => router.push("/(patient)/addMedication")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  //BODY
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
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#2563EB",
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    marginRight: 6,
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },

  // card buttons
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 10,
  },
  editButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600"
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontWeight: "600"
  },

  //FAB
  fab: {
    position: "absolute",
    right: 24,
    backgroundColor: "#2563EB",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300"
  }
});