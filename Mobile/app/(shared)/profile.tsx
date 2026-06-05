import React, { useState, useCallback } from "react";
import { StyleSheet, View, Text, ActivityIndicator, FlatList, TextInput, TouchableOpacity, ToastAndroid } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/authContext";
import { BASE_URL } from "@/constants/api";
import Header from "@/components/Header";

interface UserProfile {
    name: string;
    email: string;
    role: "patient" | "caregiver";
    phone: string;
    createdAt: string;
}

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [updating, setUpdating] = useState(false);

    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {
                    const res = await fetch(`${BASE_URL}/api/users/profile`, {
                        headers: { Authorization: `Bearer ${user?.token}` }
                    });

                    const result = await res.json();
                    if (result.success) {
                        setProfile(result.data);
                        setEditName(result.data.name);
                        setEditPhone(result.data.phone);
                    }
                } catch (err) {
                    console.error("Failed to load user profile settings: ", err);
                } finally {
                    setLoading(false);
                }
            };

            if (user) {
                fetchProfile();
            }
        }, [user])
    );

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            ToastAndroid.show("Name cannot be empty", ToastAndroid.SHORT);
            return;
        }
        setUpdating(true);

        try {
            const res = await fetch(`${BASE_URL}/api/users/profile`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: editName,
                    phone: editPhone
                })
            });

            const result = await res.json();
            if (result.success) {
                setProfile(result.data);
                setIsEditing(false);
                ToastAndroid.show("Profile updated successfully", ToastAndroid.SHORT);
            } else {
                ToastAndroid.show(result.message || "Failed to update profile", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Profile update error: ", err);
            ToastAndroid.show("Server Connection Failure", ToastAndroid.SHORT);
        } finally {
            setUpdating(false);
        }
    };

    const handleCancelEdit = () => {
        if (profile) {
            setEditName(profile.name);
            setEditPhone(profile.phone);
        }
        setIsEditing(false);
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    const dataList = profile ? [profile] : [];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Header user={user} signOut={signOut} />

            <View style={styles.body}>
                <Text style={styles.screenTitle}>Profile</Text>

                <FlatList
                    data={dataList}
                    keyExtractor={(item) => item.email}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    renderItem={({ item }) => (
                        <View style={styles.profileCard}>
                            <View style={styles.avatarSection}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarInitial}>
                                        {(isEditing ? editName : item.name)?.charAt(0).toUpperCase() || "U"}
                                    </Text>
                                </View>
                                {!isEditing && <Text style={styles.profileName}>{item.name}</Text>}
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                                </View>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.fieldLabel}>Name</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.textInput}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Enter your name"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                ) : (
                                    <Text style={styles.fieldValue}>{item.name}</Text>
                                )}
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.fieldLabel}>Email</Text>
                                <Text style={[styles.fieldValue, isEditing && styles.disabledText]}>{item.email}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.fieldLabel}>Phone Number</Text>
                                {isEditing ? (
                                    <TextInput
                                        style={styles.textInput}
                                        value={editPhone}
                                        onChangeText={setEditPhone}
                                        placeholder="Enter your phone number"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="phone-pad"
                                    />
                                ) : (
                                    <Text style={styles.fieldValue}>{item.phone}</Text>
                                )}
                            </View>

                            <View style={[styles.infoRow, styles.noBorder]}>
                                <Text style={styles.fieldLabel}>Registration Date</Text>
                                <Text style={[styles.fieldValue, styles.disabledText]}>{item.createdAt.split("T")[0]}</Text>
                            </View>

                            <View style={styles.buttonToolbar}>
                                {isEditing ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtn]}
                                            onPress={handleCancelEdit}
                                            disabled={updating}
                                        >
                                            <Text style={styles.cancelBtnText}>Cancel</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.saveBtn]}
                                            onPress={handleSaveProfile}
                                            disabled={updating}
                                        >
                                            {updating ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.saveBtnText}>Save</Text>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, styles.editBtn]}
                                        onPress={() => setIsEditing(true)}
                                    >
                                        <Text style={styles.editBtnText}>Edit Profile</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Unable to load user data</Text>
                        </View>
                    }
                />
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
        paddingHorizontal: 16,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginVertical: 16
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    profileCard: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7Eb",
        elevation: 1,
        marginBottom: 10,
    },
    avatarSection: {
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7Eb",
        paddingBottom: 20,
        marginBottom: 16
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#2563EB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12
    },
    avatarInitial: {
        color: "#FFFFFF",
        fontSize: 28,
        fontWeight: "700"
    },
    profileName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 6
    },
    roleBadge: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "#DBEAFE"
    },
    roleText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#2563EB"
    },
    infoRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6"
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 0.5,
        marginBottom: 4
    },
    fieldValue: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111827"
    },
    disabledText: {
        color: "#9CA3AF"
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        color: "#111827",
        backgroundColor: "#F9FAFB",
        marginTop: 4
    },
    buttonToolbar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6"
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center"
    },
    editBtn: {
        backgroundColor: "#2563EB",
        elevation: 1
    },
    editBtnText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600"
    },
    cancelBtn: {
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginRight: 8
    },
    cancelBtnText: {
        color: "#374151",
        fontSize: 14,
        fontWeight: "600"
    },
    saveBtn: {
        backgroundColor: "#2563EB",
        marginLeft: 8,
        elevation: 1
    },
    saveBtnText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600"
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 40
    },
    emptyText: {
        color: "#6B7280",
        fontSize: 14
    }
});