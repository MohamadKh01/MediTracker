import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// structure of authContext
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

    // run only once when app starts, check if user data is saved in phone's local storage
    useEffect(() => {
        const loadStorage = async () => {
            const info = await AsyncStorage.getItem("userInfo");

            if (info) {
                try {
                    // save user data in state if they exist
                    setUser(JSON.parse(info));
                } catch (err) {
                    console.error("failed to parse user info: ", err);
                    // clean local storage if data is corrupted
                    AsyncStorage.removeItem("userInfo");
                }
            }

            setIsLoading(false);
        };
        loadStorage();
    }, []);

    const signIn = async (data: any) => {
        // save user data in state and in local storage
        setUser(data);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data));

        // redirect based on role
        if (data.role === "patient") {
            router.replace("/(patient)/dashboard");
        }
        else if (data.role === "caregiver") {
            router.replace("/(caregiver)/dashboard");
        }
    };

    const signOut = async () => {
        //clear user data from state and local storage
        setUser(null);
        await AsyncStorage.removeItem("userInfo");
        await AsyncStorage.removeItem("userToken");

        //redirect to index page
        router.replace("/");
    };

    const authenticate = async (group: any) => {
        // return to index if user doesn't exist
        if (!user) {
            return router.replace("/");
        }

        // if user accessed a page for a different role, log him out
        if (group !== user.role) {
            alert("Unauthorized access!! you are being logged out!!");
            signOut();
        }
    }

    // used by auth screens to auto redirect user if they are already logged in
    const checkLogin = async () => {
        if (user) {

            // clear navigation history to prevent user from going back to auth screens
            if (router.canDismiss()) {
                router.dismissAll();
            }

            // redirect based on role
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