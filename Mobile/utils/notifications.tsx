import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { BASE_URL } from '../constants/api';

// configure how notifications behave when the app is running in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    })
})

// request permissions for push notifications
export async function requestAndroidNotificationPermissions(): Promise<boolean> {
    // physical device safety check
    if (!Device.isDevice) {
        console.log("Push notifications are only supported on physical devices, not emulators");
        return false;
    }

    // build a high importance notification channel
    await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Medical Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#2563EB",
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
    });

    // check existing permissions
    const { status: exisingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = exisingStatus;

    // if permissions not granted, ask for them
    if (exisingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log("User denied notification permissions on this device");
        return false;
    }

    return true;
}

// fetch unique expo push token and update user's profile
export async function initializeAndSyncPushToken(userToken: string): Promise<void> {
    try {
        // check for permissions
        const hasPermission = await requestAndroidNotificationPermissions();
        if (!hasPermission) {
            return;
        }

        // fetch unique push token from expo's servers
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: "41c5c5b0-d823-42c7-aae6-6220fd22c83b",
        });

        const pushToken = tokenData.data;
        console.log("Generated android push token: ", pushToken);

        // add token to user database
        const res = await fetch(`${BASE_URL}/api/users/updateProfile`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${userToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ expoPushToken: pushToken })
        });

        const result = await res.json();
        if (result.success) {
            console.log("Push token synced to database");
        } else {
            console.error("Backend rejected token sync: ", result.message);
        }
    } catch (err) {
        console.error("Failed during push token initialization: ", err);
    }
}