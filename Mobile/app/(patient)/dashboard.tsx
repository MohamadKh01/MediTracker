import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";

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
  const { user, isLoading, signOut, authenticate } = useAuth();

  const insets = useSafeAreaInsets();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    fetchMedications();
  }, [isLoading, user]);

  useFocusEffect(
    useCallback(() => {
      if(!user){
        return;
      }
      fetchMedications();
    }, [user])
  );

  const fetchMedications = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      const result = await response.json();

      if (result.success) {
        setMedications(result.data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setFetching(false);
    }
  };

  if (isLoading || !user || user.role !== "patient") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.brand}>MediTracker</Text>

        <TouchableOpacity style={styles.userSection} onPress={() => signOut()}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name || "User"}</Text>
            <Text style={styles.userRole}>{user.role}</Text>
          </View>
          <View style={styles.profilePic}>
            <Text style={styles.profileLetter}>
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Today's Medications</Text>
        {fetching ? (
          <ActivityIndicator color="#2196F3" />
        ) : (
          <FlatList data={medications} keyExtractor={(item) => item._id} renderItem={({ item }) => (
            <View style={styles.medCard}>
              <View>
                <Text style={styles.medName}>{item.name}</Text>
                <Text style={styles.medSubtext}>{item.dosage} - {item.frequency} x daily</Text>
              </View>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{item.times && item.times.length > 0 ? item.times.join('; ') : "No time"}</Text>
              </View>
            </View>
          )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No medications scheduled.</Text>
              </View>
            } />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => router.push("/(patient)/addMedication")}>
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

  // HEADER
  header: {
    paddingTop: Platform.OS === "android" ? 40 : 10,
    height: 100,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center"
  },
  userInfo: {
    marginRight: 12,
    alignItems: "flex-end",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  userRole: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  profileLetter: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  //BODY
  body: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  medCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },

  //FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    backgroundColor: "#2563EB",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "300"
  }
});