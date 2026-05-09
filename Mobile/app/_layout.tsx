import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Keyboard, Pressable, StyleSheet, DeviceEventEmitter } from "react-native";
import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "@/context/authContext";
import { registerForPushNotificationsAsync, setNotificationCategories } from "@/utils/notifications";
import { BASE_URL } from "@/constants/api";
import { getLocalDateString } from "@/utils/dates";

function RootLayoutNav() {
  const { user } = useAuth();
  const router = useRouter();

  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    // initiate notification settings
    const setupNotifications = async () => {
      await registerForPushNotificationsAsync();
      await setNotificationCategories();
    };
    setupNotifications();

    // listen for notification interactions
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification } = response;

      const data = response.notification.request.content.data as {
        medicationId: string,
        medicationName: string,
        scheduledTime: string,
      };

      const actionId = response.actionIdentifier;

      await Notifications.dismissNotificationAsync(notification.request.identifier);
      // handle mark as taken
      if (actionId === 'mark-taken') {
        if (!user?.token) {
          return console.error("No user token found!");
        }

        try {
          const dateStr = getLocalDateString(new Date());

          const res = await fetch(`${BASE_URL}/api/adherence`, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${user.token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              user: user._id,
              medicationId: data.medicationId,
              dateString: dateStr,
              scheduledTime: data.scheduledTime,
              status: "taken"
            })
          });

          if (res.ok) {
            // send signal to refresh dashboard
            DeviceEventEmitter.emit("medicationTaken");
          }
          else {
            const errData = await res.json();
            console.error("server Error:", errData);
          }

        } catch (err) {
          console.error("Background sync failed:", err);
        }
      }

      else if (actionId === 'snooze') {
        const snoozeDate = new Date();
        snoozeDate.setMinutes(snoozeDate.getMinutes() + 10);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Snoozed Reminder 🔔",
            body: `Don't forget: ${data.medicationName}`,
            data,
            categoryIdentifier: "medication-actions",
            color: "#41a6ff"
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: snoozeDate
          },
        });
      }

      else {
        router.push("/(patient)/dashboard");
      }
    });

    return () => subscription.remove();
  }, [user]);

  return (
    // KeyboardAvoidingView prevents the keyboard from covering up input fields
    // it pushes the UI up when the keyboard opens
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} >
      {/* this pressable covers the entire screen, dismiss keyboard when user taps outside a text input */}
      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      {/* manage navigation between screens */}
      <Stack screenOptions={{ headerShown: false }} />
    </KeyboardAvoidingView>
  );
}

export default function Layout() {
  return (
    // AuthProvider wraps the whole app and make sure every screen have access to user login status and data
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}