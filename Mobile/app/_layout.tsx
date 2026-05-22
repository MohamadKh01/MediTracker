import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { KeyboardAvoidingView, Keyboard, Pressable, StyleSheet, DeviceEventEmitter } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthProvider, useAuth } from "@/context/authContext";
import { registerForPushNotificationsAsync, setNotificationCategories, NOTIFICATIONS_STORAGE_KEY } from "@/utils/notifications";
import { BASE_URL } from "@/constants/api";
import { getLocalDateString } from "@/utils/dates";

function RootLayoutNav() {
  const { user } = useAuth();
  const router = useRouter();

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
      const notificationId = notification.request.identifier;

      const data = response.notification.request.content.data as {
        medicationId: string,
        medicationName: string,
        scheduledTime: string,
      };

      const actionId = response.actionIdentifier;

      if (notificationId) {
        try {
          await Notifications.dismissNotificationAsync(notificationId);
        } catch (err) {
          console.warn("Could not clear notification tray item: ", err);
        }
      }

      const dateStr = getLocalDateString(new Date());

      // handle mark as taken
      if (actionId === 'mark-taken') {
        let token = user?.token;
        let userId = user?._id;

        if (!token) {
          const storedInfo = await AsyncStorage.getItem("userInfo");
          if (storedInfo) {
            const parsed = JSON.parse(storedInfo);
            token = parsed.token;
            userId = parsed._id;
          }
        }

        if (!token) {
          return console.error("No user token found!");
        }

        try {
          //log adherence history record
          const res = await fetch(`${BASE_URL}/api/adherence`, {
            method: 'POST',
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              user: userId,
              medicationId: data.medicationId,
              dateString: dateStr,
              scheduledTime: data.scheduledTime,
              status: "taken"
            })
          });

          // clear out active notification from queue
          await fetch(`${BASE_URL}/api/notifications/clear-completed`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              medicationId: data.medicationId,
              scheduledTime: data.scheduledTime,
              dateString: dateStr
            })
          });

          if (res.ok) {
            // send signal to refresh dashboard
            DeviceEventEmitter.emit("medicationTaken");
            router.push({
              pathname: "/(patient)/dashboard",
              params: { expandMedicationId: data.medicationId }
            });
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
        let token = user?.token;

        if (!token) {
          const storedInfo = await AsyncStorage.getItem("userInfo");
          if (storedInfo) {
            token = JSON.parse(storedInfo).token;
          }
        }

        if (!token) {
          return console.error("No user token found");
        }
        try {
          // update database record string status field to 'snoozed'
          await fetch(`${BASE_URL}/api/notifications/snooze`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              medicationId: data.medicationId,
              scheduledTime: data.scheduledTime,
              dateString: dateStr
            })
          });

          //schedule local reminder notification for 10 min
          const snoozeDate = new Date();
          snoozeDate.setMinutes(snoozeDate.getMinutes() + 10);

          const snoozedNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Snoozed Reminder 🔔",
              body: `Don't forget: ${data.medicationName}`,
              data,
              categoryIdentifier: "medication-actions",
              color: "#2563EB"
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: snoozeDate.getTime()
            },
          });

          const existingData = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
          const storage = existingData ? JSON.parse(existingData) : {};
          const currentMedIds = storage[data.medicationId] || [];
          storage[data.medicationId] = [...currentMedIds, snoozedNotificationId];
          await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(storage));
        } catch (err) {
          console.error("Snooze background task failed: ", err);
        }
      }
      else {
        router.push("/(patient)/dashboard");
      }
    });

    return () => subscription.remove();
  }, [user, router]);

  return (
    // KeyboardAvoidingView prevents the keyboard from covering up input fields
    // it pushes the UI up when the keyboard opens
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
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