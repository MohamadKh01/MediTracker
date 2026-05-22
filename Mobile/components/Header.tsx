import React, { Profiler, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";

interface HeaderProps {
    user: {
        name?: string;
        role?: string;
    } | null;
    signOut: () => void;
}

export default function Header({ user, signOut }: HeaderProps) {
    const [menuVisible, setMenuVisible] = useState(false);

    const handleMenuAction = (routePath: string | null, actionCallback?: () => void) => {
        setMenuVisible(false);
        if (actionCallback) {
            actionCallback();
        } else if (routePath) {
            router.push(routePath as any);
        }
    };

    return (
        <>
            {/* tap overlay layer to dismiss dropdown options panel */}
            {menuVisible && (
                <Pressable style={styles.backdrop} onPress={() => setMenuVisible(false)} />
            )}

            <View style={styles.header}>
                <Text style={styles.brand}>MediTracker</Text>

                <TouchableOpacity
                    style={styles.userSection}
                    onPress={() => setMenuVisible(!menuVisible)}
                    activeOpacity={0.7}
                >
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || "User"}</Text>
                        <Text style={styles.userRole}>{user?.role || ""}</Text>
                    </View>
                    <View style={styles.profilePic}>
                        <Text style={styles.profileLetter}>
                            {user?.name ? user.name?.charAt(0).toUpperCase() : "U"}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Dropdown options list menu overlaying layout element below */}
                {menuVisible && (
                    <View style={styles.dropdownMenu}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('/(patient)/dashboard')}>
                            <Text style={styles.menuText}>Dashboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('/(patient)/historyLog')}>
                            <Text style={styles.menuText}>History</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('/(patient)/dashboard')}>
                            <Text style={styles.menuText}>Settings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.menuItem, styles.lastItem]} onPress={() => handleMenuAction(null, signOut)}>
                            <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 60,
        backgroundColor: "#FFFFFF",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        position: 'relative',
        zIndex: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99,
    },
    brand: {
        fontSize: 22,
        fontWeight: "800",
        color: "#2563EB",
    },
    userSection: {
        flexDirection: "row",
        alignItems: "center",
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
        fontSize: 16,
    },
    dropdownMenu: {
        position: "absolute",
        top: 55,
        right: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        width: 160,
        elevation: 6,
        paddingVertical: 4,
        zIndex: 101,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    menuText: {
        fontSize: 15,
        color: "#1F2937",
    },
    signOutText: {
        color: "#EF4444",
        fontWeight: "600",
    },
});