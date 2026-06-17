import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { KeyboardAvoidingView } from "react-native";
import * as Notifications from 'expo-notifications';

import { AuthProvider } from "../context/authContext";

function RootLayoutNav() {

  useEffect(() => {
    //listen for when a user taps on a notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        // extract data payload sent from backend
        const data = response.notification.request.content.data;
        console.log("Notification payload caught on click: ", data);

        if(data?.screen === 'PatientLogs' && data?.id) {
          router.push({
            pathname: '/(caregiver)/patientLogs',
            params: { id: String(data.id) }
          });
        }
      } catch(err) {
        console.error("Error handling notification click redirect: ", err);
      }
    });

    return () => {
      responseSubscription.remove();
    }
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <Stack screenOptions={{ headerShown: false }} />
    </KeyboardAvoidingView >
  );
}

export default function RootLayout() {
  return (
    //AuthProvider wraps the entire app and make sure every screen have access to user login status and data
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
