import { View, StyleSheet, Pressable, Text } from "react-native";

import { useAuth } from "../../context/authContext";
import VerifyEmail from "../../components/verifyEmail";

export default function VerifyEmailScreen() {
    const { user, updateUser, signOut } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <VerifyEmail
                    email={user?.email || ""}
                    onSuccess={() => {
                        updateUser({ isEmailVerified: true });
                    }}
                />
            </View>
            <Pressable style={styles.logoutButton} onPress={signOut}>
                <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    content: {
        flex: 1,
    },
    logoutButton: {
        paddingVertical: 16,
        alignItems: "center",
        marginBottom: 20
    },
    logoutText: {
        color: "#DC2626",
        fontWeight: "600",
        fontSize: 14
    }
});