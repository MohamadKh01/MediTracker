import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastAndroid } from 'react-native';
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// User structure
interface User {
    _id: string;
    name: string;
    username: string;
    email: string;
    role: 'patient' | 'caregiver';
    dateOfBirth: string | null;
    age: number | null;
    gender: "male" | "female" | "prefer not to say";
    bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "not specified";
    token: string;
    phone: string;
}

// authContext structure
const AuthContext = createContext<{
    user: User | null;
    isLoading: boolean;
    signIn: (data: User) => void;
    signOut: () => void;
    authenticate: (group: 'patient' | 'caregiver') => void;
    checkLogin: () => void;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // run only once when the app starts to check if user data is saved in local storage
    useEffect(() => {
        const loadStorage = async () => {
            try {
                const info = await AsyncStorage.getItem('userInfo');

                // save user data in state if it exists
                if (info) {
                    setUser(JSON.parse(info));
                }
            } catch (err) {
                console.error("Failed to parse user info: ", err);
                await AsyncStorage.removeItem('userInfo');
            } finally {
                setIsLoading(false);
            }
        };

        loadStorage();
    }, []);

    const signIn = async (data: User) => {
        try {
            // save user data in state and in local storage
            setUser(data);
            await AsyncStorage.setItem('userInfo', JSON.stringify(data));

            // redirect based on role
            if (data.role === 'patient') {
                router.replace('/(patient)/dashboard');
            } else if (data.role === 'caregiver') {
                router.replace('/(caregiver)/dashboard');
            }
        } catch (err) {
            console.error("Sign in storage error: ", err);
            ToastAndroid.show("Failed to securely save login session", ToastAndroid.SHORT);
        }
    };

    const signOut = async () => {
        try {
            // clear user data from state and local storage
            setUser(null);
            await Promise.all([
                AsyncStorage.removeItem('userInfo'),
                AsyncStorage.removeItem('userToken')
            ]);

            if (router.canDismiss()) {
                router.dismissAll();
            }

            // redirect to index page
            router.replace('/');
        } catch (err: any) {
            console.error("Sign out storage error: ", err);
            ToastAndroid.show(err.message || "Sign out failed", ToastAndroid.SHORT);
        }
    };

    const authenticate = async (group: 'patient' | 'caregiver') => {
        //return to index if user doesn't exists
        if (!user) {
            router.replace('/');
            return;
        }

        // log out user if he accessed a page for a different role
        if (group != user?.role) {
            ToastAndroid.show("Unauthorized access", ToastAndroid.SHORT);
            await signOut();
        }
    };

    // used by auth screens to auto redirect user if they are already logged in
    const checkLogin = async () => {
        if (user) {
            // clear nav history to prevent user from going back to auth screens
            if (router.canDismiss()) {
                router.dismissAll();
            }

            // redirect based on role
            if (user.role === 'patient') {
                router.replace('/(patient)/dashboard');
            } else if (user.role === 'caregiver') {
                router.replace('/(caregiver)/dashboard');
            } else {
                ToastAndroid.show("Unknown user role!", ToastAndroid.SHORT);
                await signOut();
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, authenticate, checkLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

// ! on the end prevents error on the next page
// it tells the compiler "i know this value is not null so don't throw a type error"
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}