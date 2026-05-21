import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const NOTIFICATIONS_STORAGE_KEY = '@med_notification_ids';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    })
})

// permissions and channels
export async function registerForPushNotificationsAsync() {
    let { status } = await Notifications.getPermissionsAsync();

    if (status !== 'granted') {
        const request = await Notifications.requestPermissionsAsync();
        status = request.status;
    }

    if (status !== 'granted') {
        alert("Permission for notifications not granted! Please enable in Settings.");
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('medication-reminders', {
            name: 'Medication Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
            showBadge: true,
        });
    }
    return true;
}

// action buttons (mark as taken / snooze)
export async function setNotificationCategories() {
    await Notifications.setNotificationCategoryAsync('medication-actions', [
        {
            identifier: 'mark-taken',
            buttonTitle: 'Mark as Taken ✅',
            options: { opensAppToForeground: true },
        },
        {
            identifier: 'snooze',
            buttonTitle: 'Snooze (10m) 😴',
            options: { opensAppToForeground: true },
        },
    ]);
}

// schedule and store reminders
export async function scheduleAndStoreNotifications(medicationId: string, pillName: string, times: { hour: number, minute: number }[]) {
    const newIds: string[] = [];

    for (const time of times) {
        try {
            const id = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Pill Reminder 💊",
                    body: `It's time to take your ${pillName}.`,
                    categoryIdentifier: 'medication-actions',
                    color: "#41a6ff",
                    data: {
                        medicationId: medicationId,
                        medicationName: pillName,
                        scheduledTime: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
                    },
                },
                trigger: {
                    hour: time.hour,
                    minute: time.minute,
                    channelId: 'medication-reminders',
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                },
            });
            newIds.push(id);
        } catch (err) {
            console.error("Schedule error: ", err);
        }
    }

    // save the ids locally
    const existingData = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    const storage = existingData ? JSON.parse(existingData) : {};
    const currentMedIds = storage[medicationId] || [];
    storage[medicationId] = [...currentMedIds, ...newIds];
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(storage));

    return newIds;
}

// cancel specific reminders
export async function cancelMedicationReminders(medicationId: string) {
    const existingData = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!existingData) {
        return;
    }

    const storage = JSON.parse(existingData);
    const idsToCancel = storage[medicationId];

    if (idsToCancel) {
        for (const id of idsToCancel) {
            await Notifications.cancelScheduledNotificationAsync(id);
        }
        delete storage[medicationId];
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(storage));
    }
}