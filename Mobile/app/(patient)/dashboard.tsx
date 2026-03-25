import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect } from "react";

import { useAuth } from "@/context/authContext";

export default function PatientDashboard() {
  const { user, isLoading, signOut, authenticate } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      authenticate("patient");
    }
  }, [isLoading]);

  const HandleLogout = async () => {
    await signOut();
  }

  if (isLoading || !user || user.role !== "patient") {
    return null
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient Dashboard</Text>
      <Pressable style={styles.button} onPress={HandleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#B91C1C",
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});