import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CaregiverDashboard() {

    const HandleLogout = async () => {
        await AsyncStorage.removeItem("userInfo");
        await AsyncStorage.removeItem("userToken");

        router.replace("./login");
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Caregiver Dashboard</Text>
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