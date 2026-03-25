import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext<{
    user: any;
    isLoading: boolean;
    signIn: (data: any) => void;
    signOut: () => void;
    authenticate: (group: any) => void;
    checkLogin: () => void;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStorage = async () => {
            const info = await AsyncStorage.getItem("userInfo");

            if (info) {
                try {
                    setUser(JSON.parse(info));
                } catch (err) {
                    console.error("failed to parse user info: ", err);
                    AsyncStorage.removeItem("userInfo");
                }
            }

            setIsLoading(false);
        };
        loadStorage();
    }, []);

    const signIn = async (data: any) => {
        setUser(data);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data));

        if (data.role === "patient") {
            router.replace("/(patient)/dashboard");
        }
        else if (data.role === "caregiver") {
            router.replace("/(caregiver)/dashboard");
        }
    };

    const signOut = async () => {
        setUser(null);
        await AsyncStorage.removeItem("userInfo");
        await AsyncStorage.removeItem("userToken");

        router.replace("/");
    };

    const authenticate = async (group: any) => {
        if (!user) {
            return router.replace("/");
        }
        if (group !== user.role) {
            alert("Unauthorized access!! you are being logged out!!");
            signOut();
        }
    }

    const checkLogin = async () => {
        if (user) {

            if (router.canDismiss()) {
                router.dismissAll();
            }

            if (user.role === "patient") {
                router.replace("/(patient)/dashboard");
            }
            else if (user.role === "caregiver") {
                router.replace("/(caregiver)/dashboard");
            }
            else {
                alert("Unknown user role! you are being logged out!");
                router.replace("/");
            }
        }
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, authenticate, checkLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

// ! at the end is added to prevent error on next page
// it tells the compiler: "i know this value is not null so don't throw a type error"
export const useAuth = () => useContext(AuthContext)!;