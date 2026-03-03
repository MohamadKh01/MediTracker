import { Text, View, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MediTracker</Text>
      <Text style={styles.subtitle}>Stay on Track. Stay Healthy</Text>

      <Pressable style={styles.button} onPress={() => router.push("./login")}>
        <Text style={styles.buttonText}>Login</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push("./register")}>
        <Text style={styles.buttonText}>Register</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
  },
  button: {
    width: "100%",
    backgroundColor: "#1E3A8A",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});