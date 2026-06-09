import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TextInput, TouchableOpacity, Modal, ToastAndroid, RefreshControl } from "react-native";
import { useFocusEffect, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";
import Header from "@/components/Header";

interface PatientSummary {
  _id: string;
  name: string;
  email: string;
  phone: string;
  medicationsCount: number;
  todaySummary: {
    taken: number;
    missed: number;
    pending: number;
  };
}

export default function CaregiverDashboard() {
  const { user, isLoading, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);

  const fetchCaregiverFeed = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${BASE_URL}/api/caregiver/dashboard`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      const result = await res.json();
      if (result.success) {
        setPatients(result.data);
      }
    } catch (err) {
      console.error("Failed to load caregiver dashboard logs: ", err);
      ToastAndroid.show("Failed to refresh feed", ToastAndroid.SHORT);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!isLoading && user) {
        fetchCaregiverFeed();
      }
    }, [isLoading, user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCaregiverFeed();
  };

  const handleLinkPatient = async () => {
    if (!linkEmail.trim()) {
      ToastAndroid.show("Please enter an email address", ToastAndroid.SHORT);
      return;
    }
    setLinking(true);
    try {
      const res = await fetch(`${BASE_URL}/api/caregiver/link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: linkEmail.trim() })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        ToastAndroid.show(result.message || "Patient linked successfully", ToastAndroid.SHORT);
        setLinkEmail("");
        setModalVisible(false);
        fetchCaregiverFeed();
      } else {
        ToastAndroid.show(result.message || "Failed to link patient", ToastAndroid.SHORT);
      }
    } catch (err) {
      console.error("link patient connection error: ", err);
      ToastAndroid.show("Server connection failure", ToastAndroid.SHORT);
    } finally {
      setLinking(false);
    }
  };

  if (isLoading || !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header user={user} signOut={signOut} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Monitoring Feed</Text>
          <TouchableOpacity style={styles.addPatientBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addPatientBtnText}>Add Patient</Text>
          </TouchableOpacity>
        </View>

        {fetching && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />}
            renderItem={({ item }) => (
              <Link href={{
                pathname: "/(caregiver)/patient/[id]",
                params: { id: item._id }
              }}
                asChild>
                <TouchableOpacity activeOpacity={0.8} style={styles.patientCard}>
                  <View style={styles.patientHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerDetails}>
                      <Text style={styles.patientName}>{item.name}</Text>
                      <Text style={styles.patientContact}>{item.phone} • {item.email}</Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={[styles.metricsBox, styles.bgTotal]}>
                      <Text style={styles.metricsValue}>{item.medicationsCount}</Text>
                      <Text style={styles.metricsLabel}>Total Meds</Text>
                    </View>

                    <View style={[styles.metricsBox, styles.bgTaken]}>
                      <Text style={[styles.metricsValue, styles.textTaken]}>{item.todaySummary.taken}</Text>
                      <Text style={styles.metricsLabel}>Taken Today</Text>
                    </View>

                    <View style={[styles.metricsBox, styles.bgMissed]}>
                      <Text style={[styles.metricsValue, styles.textMissed]}>{item.todaySummary.missed}</Text>
                      <Text style={styles.metricsLabel}>Missed Today</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No managed patients linked to this account</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link New Patient</Text>
            <Text style={styles.modalSubtitle}>Enter the patient email address</Text>

            <TextInput
              style={styles.textInput}
              value={linkEmail}
              onChangeText={setLinkEmail}
              placeholder="patient@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!linking}
            />
            <View style={styles.modalToolbar}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => { setModalVisible(false); setLinkEmail(""); }}
                disabled={linking}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSaveBtn]}
                onPress={handleLinkPatient}
                disabled={linking}
              >
                {linking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6"
  },
  body: {
    flex: 1,
    paddingHorizontal: 16
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16
  },
  screenTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#111827"
  },
  addPatientBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 1
  },
  addPatientBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 1
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 12
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB"
  },
  headerDetails: {
    marginLeft: 12,
    flex: 1
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  patientContact: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metricsBox: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 4
  },
  bgTotal: {
    backgroundColor: "#F3F4F6"
  },
  bgTaken: {
    backgroundColor: "#D1FAE5",
  },
  bgMissed: {
    backgroundColor: "#FEE2E2"
  },
  metricsValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151"
  },
  textTaken: {
    color: "#059669"
  },
  textMissed: {
    color: "#DC2626"
  },
  metricsLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    elevation: 6
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 20
  },
  modalToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  modalCancelBtn: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8
  },
  modalCancelBtnText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    marginLeft: 8,
    elevation: 1
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  }
});