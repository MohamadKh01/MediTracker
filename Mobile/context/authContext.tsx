import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext<{
    user: any;
    isLoading: boolean;
    signIn: (data: any) => void;
    signOut: () => void;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStorage = async () => {
            const info = await AsyncStorage.getItem("userInfo");

            if (info) {
                setUser(JSON.parse(info));
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

        router.replace("/(auth)/login");
    };

    const authenticate = async (group: any) => {
        if (!user) {
            router.replace("/(auth)/login");
        }
        if (group !== user.role) {
            signOut();
            router.replace("/(auth)/login");
        }
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

// ! at the end is added to prevent error on next page
// it tells the compiler: "i know this value is not null so don't throw a type error"
export const useAuth = () => useContext(AuthContext)!;