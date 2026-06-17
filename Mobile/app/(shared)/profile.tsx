import React, { useState, useCallback } from "react";
import { StyleSheet, View, Text, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, ToastAndroid, Modal, Keyboard } from "react-native";
import { useFocusEffect } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

import { useAuth } from "../../context/authContext";
import { BASE_URL } from "../../constants/api";

interface UserProfile {
    name: string;
    username: string;
    email: string;
    role: "patient" | "caregiver";
    phone: string;
    dateOfBirth: string | null;
    age: number | null;
    gender: "male" | "female" | "prefer not to say";
    bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "not specified";
    createdAt: string;
}

export default function ProfileScreen() {
    const { user, isLoading } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [localLoading, setLocalLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [editName, setEditName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editDOB, setEditDOB] = useState<Date | null>(null);
    const [editGender, setEditGender] = useState<UserProfile['gender']>("prefer not to say");
    const [editBlood, setEditBlood] = useState<UserProfile["bloodType"]>("not specified");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);

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
                        setEditUsername(result.data.username || "");
                        setEditPhone(result.data.phone || "");
                        setEditDOB(result.data.dateOfBirth ? new Date(result.data.dateOfBirth) : null);
                        setEditGender(result.data.gender || "prefer not to say");
                        setEditBlood(result.data.bloodType || "not specified");
                    }
                } catch (err) {
                    console.error("failed to load user profile data: ", err);
                    ToastAndroid.show("Failed to load profile data", ToastAndroid.SHORT);
                } finally {
                    setLocalLoading(false);
                }
            };

            if (user && !isLoading) {
                fetchProfile();
            }
        }, [user, isLoading])
    );

    const handleSaveProfile = async () => {
        if (!editName.trim() || !editUsername.trim()) {
            ToastAndroid.show("Name and username cannot be empty", ToastAndroid.SHORT);
            return;
        }
        setUpdating(true);
        Keyboard.dismiss();

        try {
            const res = await fetch(`${BASE_URL}/api/users/updateProfile`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: editName.trim(),
                    username: editUsername.trim().toLowerCase(),
                    phone: editPhone.trim(),
                    dateOfBirth: editDOB,
                    gender: editGender,
                    bloodType: editBlood
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
            ToastAndroid.show("Server Connection failure", ToastAndroid.SHORT);
        } finally {
            setUpdating(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            ToastAndroid.show("Please fill all password fields", ToastAndroid.SHORT);
            return;
        }

        if (currentPassword === newPassword) {
            ToastAndroid.show("Old and new password cannot be the same", ToastAndroid.SHORT);
            return;
        }
        setChangingPassword(true);

        try {
            const res = await fetch(`${BASE_URL}/api/auth/changePass`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await res.json();
            if (res.ok) {
                ToastAndroid.show("Password updated successfully", ToastAndroid.SHORT);
                setCurrentPassword("");
                setNewPassword("");
                setPasswordModalVisible(false);
            }
            else {
                ToastAndroid.show(result.message || "Failed to update Password", ToastAndroid.SHORT);
            }
        } catch (err) {
            console.error("Password modification error: ", err)
            ToastAndroid.show("Password modification connection error", ToastAndroid.SHORT);
        } finally {
            setChangingPassword(false);
        }
    };


    const handleCancelEdit = () => {
        if (profile) {
            setEditName(profile.name);
            setEditUsername(profile.username);
            setEditPhone(profile.phone);
            setEditBlood(profile.bloodType || "not specified");
            setEditDOB(profile.dateOfBirth ? new Date(profile.dateOfBirth) : null);
            setEditGender(profile.gender || "prefer not to say");
        }
        setIsEditing(false);
        Keyboard.dismiss();
    }

    const handleDOBChange = (selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setEditDOB(selectedDate);
        }
    }

    

    if (localLoading || !profile) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        )
    }

    return (
        <ScrollView
            style={styles.outerContainer}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.screenTitle}>Profile</Text>

            <View style={styles.profileCard}>
                <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                            {(isEditing ? editName : profile.name)?.charAt(0).toUpperCase() || "U"}
                        </Text>
                    </View>
                    {!isEditing && <Text style={styles.profileName}>{profile.name}</Text>}
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Full name</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.textInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="John Doe"
                            placeholderTextColor="#9CA3AF"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{profile.name}</Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Username</Text>
                    {isEditing ? (
                        <TextInput
                            style={styles.textInput}
                            value={editUsername}
                            onChangeText={setEditUsername}
                            placeholder="John_Doe"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>@{profile.username || "not_set"}</Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Email address</Text>
                    <Text style={[styles.fieldValue, styles.disabledText]}>{profile.email}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Phone number</Text>
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
                        <Text style={styles.fieldValue}>{profile.phone || "Not provided"}</Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Date of birth</Text>
                    {isEditing ? (
                        <>
                            <TouchableOpacity
                                style={styles.selectorTrigger}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.selectorTriggerText}>
                                    {editDOB ? editDOB.toISOString().split("T")[0] : "Select Date"}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={editDOB || new Date()}
                                    mode="date"
                                    maximumDate={new Date()}
                                    onValueChange={(event, date) => {
                                        if (date) handleDOBChange(date);
                                    }}
                                    onDismiss={() => setShowDatePicker(false)}
                                />
                            )}
                        </>
                    ) : (
                        <Text style={styles.fieldValue}>
                            {profile.dateOfBirth ? profile.dateOfBirth.split("T")[0].replace(/-/g, "/") : "Not provided"}
                            {profile.age ? ` (${profile.age} years old)` : ""}
                        </Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    {isEditing ? (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={editGender}
                                onValueChange={(itemValue) => setEditGender(itemValue)}
                                style={styles.pickerStyle}
                                dropdownIconColor="#2563EB"
                            >
                                <Picker.Item style={styles.pickerItemText} label="Male" value="male" />
                                <Picker.Item style={styles.pickerItemText} label="Female" value="female" />
                                <Picker.Item style={styles.pickerItemText} label="Prefer not to say" value="prefer not to say" />
                            </Picker>
                        </View>
                    ) : (
                        <Text style={styles.fieldValue}>{profile.gender || "Not provided"}</Text>
                    )}
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.fieldLabel}>Blood type</Text>
                    {isEditing ? (
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={editBlood}
                                onValueChange={(itemValue) => setEditBlood(itemValue)}
                                style={styles.pickerStyle}
                                dropdownIconColor="#2563EB"
                            >
                                <Picker.Item style={styles.pickerItemText} label="Not specified" value="not specified" />
                                <Picker.Item style={styles.pickerItemText} label="A+" value="A+" />
                                <Picker.Item style={styles.pickerItemText} label="A-" value="A-" />
                                <Picker.Item style={styles.pickerItemText} label="B+" value="B+" />
                                <Picker.Item style={styles.pickerItemText} label="B-" value="B-" />
                                <Picker.Item style={styles.pickerItemText} label="AB+" value="AB+" />
                                <Picker.Item style={styles.pickerItemText} label="AB-" value="AB-" />
                                <Picker.Item style={styles.pickerItemText} label="O+" value="O+" />
                                <Picker.Item style={styles.pickerItemText} label="O-" value="O-" />
                            </Picker>
                        </View>
                    ) : (
                        <Text style={styles.fieldValue}>{profile.bloodType || "Not provided"}</Text>
                    )}
                </View>

                <View style={[styles.infoRow, styles.noBorder]}>
                    <Text style={styles.fieldLabel}>Registration Date</Text>
                    <Text style={[styles.fieldValue, styles.disabledText]}>{profile.createdAt ? profile.createdAt.split("T")[0] : "Not available"}</Text>
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
                        <View style={{ flex: 1, gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.editBtn]}
                                onPress={() => setIsEditing(true)}
                            >
                                <Text style={styles.editBtnText}>Edit Profile</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.passwordTriggerBtn]}
                                onPress={() => setPasswordModalVisible(true)}
                            >
                                <Text style={styles.passwordTriggerBtnText}>security settings</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <Modal
                visible={passwordModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setPasswordModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change password</Text>

                        <Text style={styles.fieldLabel}>Current Password</Text>
                        <TextInput
                            style={styles.textInput}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            placeholder="Enter current password"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />

                        <View style={{ height: 16 }} />

                        <Text style={styles.fieldLabel}>new Password</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            placeholder="Enter new password"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="none"
                        />

                        <View style={styles.modalButtonToolbar}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setPasswordModalVisible(false);
                                    setCurrentPassword("");
                                    setNewPassword("");
                                }}
                                disabled={changingPassword}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, styles.saveBtn]}
                                onPress={handleChangePassword}
                                disabled={changingPassword}
                            >
                                {changingPassword ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Update</Text>
                                )}
                            </TouchableOpacity>

                        </View>
                    </View>
                </View>

            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: "#FFFFFF"
    },
    scrollContent: {
        paddingHorizontal: 20
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
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        marginTop: 4,
        overflow: "hidden",
        justifyContent: "center"
    },
    pickerStyle: {
        color: "#111827",
    },
    pickerItemText: {
        fontSize: 15
    },
    selectorTrigger: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#F9FAFB",
        marginTop: 4,
    },
    selectorTriggerText: {
        fontSize: 15,
        color: "#111827"
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "#00000080",
        justifyContent: "center",
        padding: 20
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        borderRadius: 12,
        padding: 20,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 20
    },
    modalButtonToolbar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 24
    },
    passwordTriggerBtn: {
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginTop: 4
    },
    passwordTriggerBtnText: {
        color: "#374151",
        fontSize: 14,
        fontWeight: "600",
        textTransform: "capitalize",
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