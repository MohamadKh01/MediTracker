const { Expo } = require('expo-server-sdk');


// initialize Expo SDK client instance
const expo = new Expo();

// Send a real-time push notification payload to an expo token destination
const sendPushNotification = async (targetPushToken, title, body, dataPayload = {}) => {
    // verify the targetPushToken matches expo's push token structure
    if (!Expo.isExpoPushToken(targetPushToken)) {
        console.error(`Push notification Error: ${targetPushToken} is not a valid Expo token.`);
        return;
    }

    // payload architecture
    const messages = [{
        to: targetPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: dataPayload,
        priority: 'high',
        channelId: 'default'
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log("Expo push notification dispatch success ticket: ", ticketChunk);
        }
    } catch (err) {
        console.error("Failed to execute push notification dispatch timeline: ", error);
    }
};

module.exports = { sendPushNotification };