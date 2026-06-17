import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, FlatList, ToastAndroid, Alert } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";

interface ConnectionUser {
    name: string;
    username: string;
    role: 'patient' | 'caregiver'
    phone?: string;
    gender?: "male" | "female" | "prefer not to say";
    bloodType?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "not specified";
    age?: number | null;
};

interface ConnectionItem {
    _id: string;
    caregiver: ConnectionUser | string;
    patient: ConnectionUser | string;
    initiatedBy: 'patient' | 'caregiver',
    status: 'pending' | 'approved' | 'rejected' | 'revoked'
    updatedAt: string;
};

export default function Connections() {
    const { user } = useAuth();

    const [connections, setConnections] = useState<ConnectionItem[]>([]);
    const [searchId, setSearchId] = useState("");
    const [fetching, setFetching] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchConnections();
            }
        }, [user])
    );

    const fetchConnections = async () => {
        try {
            setFetching(true);
            const res = await fetch(`${BASE_URL}/api/link/myLinks`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await res.json();
            if (result.success) {
                setConnections(result.data);
            } else {
                console.error("Failed to fetch links");
            }
        } catch (err) {
            console.error("Server error on fetching Links: ", err);
            ToastAndroid.show("Fetch failed", ToastAndroid.SHORT);
        } finally {
            setFetching(false);
        }
    }

    const handleSendInvitation = async () => {
        if (!searchId.trim()) {
            ToastAndroid.show("Please enter email or username", ToastAndroid.SHORT);
            return;
        }

        try {
            setFetching(true);

            const res = await fetch(`${BASE_URL}/api/link/invite`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ targetId: searchId.trim() })
            });

            const result = await res.json();
            if (result.success) {
                ToastAndroid.show(result.message || "Invitation sent successfully", ToastAndroid.SHORT);
                setSearchId("");
                await fetchConnections();
            } else {
                ToastAndroid.show(result.message || "failed to send invitation", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Failed to send Invitation: ", err);
            ToastAndroid.show("Network error", ToastAndroid.SHORT);
        } finally {
            setFetching(false);
        }
    }

    const handleRespondToInvitation = async (linkId: string, action: "approved" | "rejected") => {
        try {
            setFetching(true);
            const res = await fetch(`${BASE_URL}/api/link/respond/${linkId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ action })
            });

            const result = await res.json();
            if (result.success) {
                ToastAndroid.show(`Invitation successfully ${action}`, ToastAndroid.SHORT);
                await fetchConnections();
            } else {
                ToastAndroid.show(result.message || "Failed to respond to invitation", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Error responding to invitation: ", err);
            ToastAndroid.show("Network error", ToastAndroid.SHORT);
        } finally {
            setFetching(false);
        }
    }

    const handleRevokeConnection = async (linkId: string, targetName: string) => {
        Alert.alert(
            "Revoke Connection",
            `Are you sure you want to terminate your connection with ${targetName}? they will instantly lose access to shared medication data`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Revoke",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setFetching(true);
                            const res = await fetch(`${BASE_URL}/api/link/revoke/${linkId}`, {
                                method: "PUT",
                                headers: {
                                    Authorization: `Bearer ${user?.token}`,
                                }
                            });

                            const result = await res.json();
                            if (result.success) {
                                ToastAndroid.show("Connection revoked", ToastAndroid.SHORT);
                                setConnections(prev => prev.filter(conn => conn._id !== linkId));
                            } else {
                                ToastAndroid.show(result.message || "Failed to revoke connection", ToastAndroid.SHORT);
                            }
                        } catch (err) {
                            console.error("Revoke network error: ", err);
                            ToastAndroid.show("Network error", ToastAndroid.SHORT);
                        } finally {
                            setFetching(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.body}>
                <Text style={styles.screenTitle}>Manage Connections</Text>

                <View style={styles.searchBox}>
                    <TextInput
                        style={styles.textInput}
                        value={searchId}
                        onChangeText={setSearchId}
                        placeholder="Enter email or username"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={handleSendInvitation}>
                        <Text style={styles.addButtonText}>Add</Text>
                    </TouchableOpacity>
                </View>

                {fetching ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                ) : (
                    <FlatList
                        data={connections}
                        keyExtractor={(item) => item._id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const targetUser: any = typeof item.patient === 'object' ? item.patient : item.caregiver;
                            const isPending = item.status === 'pending';
                            const isOutgoing = item.initiatedBy === user?.role;

                            if (!targetUser) {
                                return null;
                            }
                            return (
                                <View style={styles.connectionCard}>

                                    {/* Header metadata */}
                                    <View style={styles.userProfileRow}>
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarLetter}>
                                                {targetUser.name ? targetUser.name.charAt(0).toUpperCase() : "U"}
                                            </Text>
                                        </View>
                                        <View style={styles.textDetailsColumn}>
                                            <Text style={styles.profileName}>{targetUser.name}</Text>
                                            <Text style={styles.profileRole}>
                                                {user?.role === 'caregiver' ? 'Patient Profile' : 'Caregiver Profile'} • {item.status}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardActionsFooter}>
                                        {isPending ? (
                                            isOutgoing ? (
                                                <TouchableOpacity style={[styles.baseButton, styles.disabledButton]} disabled>
                                                    <Text style={styles.disabledButtonText}>Waiting for response</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.dualActionButtonRow}>
                                                    <TouchableOpacity style={[styles.baseButton, styles.approveButton]} activeOpacity={0.8} onPress={() => handleRespondToInvitation(item._id, "approved")}>
                                                        <Text style={styles.solidButtonText}>Accept</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.baseButton, styles.rejectButton]} activeOpacity={0.8} onPress={() => handleRespondToInvitation(item._id, "rejected")}>
                                                        <Text style={styles.solidButtonText}>Decline</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        ) : (
                                            <TouchableOpacity style={[styles.baseButton, styles.revokeButton]} activeOpacity={0.8} onPress={() => handleRevokeConnection(item._id, targetUser.username)}>
                                                <Text style={styles.solidButtonText}>Revoke Access</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No connections or requests found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },
    body: {
        flex: 1,
        paddingHorizontal: 16
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: "#111827",
        marginVertical: 16
    },
    searchBox: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },
    textInput: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: "#1F2937"
    },
    addButton: {
        backgroundColor: "#2563EB",
        borderRadius: 8,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    addButtonText: {
        color: "#FFFFFF",
        fontWeight: '700',
        fontSize: 15
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    connectionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        elevation: 1
    },
    userProfileRow: {
        flexDirection: "row",
        alignItems: "center"
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#EBF5FF",
        alignItems: "center",
        justifyContent: "center"
    },
    avatarLetter: {
        color: "#2563EB",
        fontWeight: "700",
        fontSize: 16,
    },
    textDetailsColumn: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827"
    },
    profileRole: {
        fontSize: 12,
        color: "#6B7280",
        textTransform: "capitalize",
        marginTop: 2
    },
    cardActionsFooter: {
        marginTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 12
    },
    baseButton: {
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center"
    },
    dualActionButtonRow: {
        flexDirection: "row",
        gap: 10
    },
    approveButton: {
        flex: 1,
        backgroundColor: "#16A34A"
    },
    rejectButton: {
        flex: 1,
        backgroundColor: "#DC2626"
    },
    revokeButton: {
        width: "100%",
        backgroundColor: "#DC2626"
    },
    disabledButton: {
        width: "100%",
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    disabledButtonText: {
        color: "#9CA3AF",
        fontWeight: "600",
        fontSize: 14
    },
    solidButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 14
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 14
    }
})