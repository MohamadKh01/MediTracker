import * as Notifications from 'expo-notifications';
import { getLocalDateString } from './dates';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface Medication {
    _id: string;
    name: string;
    type: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'inhaler' | 'cream' | 'other';
    dosage: {
        value: number;
        unit: 'mg' | 'mcg' | 'ml' | 'drops' | 'puffs' | 'units';
    };
    frequency: {
        type: 'daily' | 'specific days' | 'as needed (PRN)' | 'interval';
        specificDays?: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[];
        intervalDays?: number;
    };
    schedule: {
        time: string;
        reminderId?: string;
    }[];
    startDate: Date;
    endDate?: Date;
    inventory: {
        trackingEnabled: boolean;
        currentQuantity?: number;
        refillThreshold?: number;
        lastRefilledDate?: Date;
    };
    instructions: 'before food' | 'with food' | 'after food' | 'empty stomach' | 'no preference';
    doctor?: {
        name: string;
        phone: string;
    };
    isActive: boolean;
    notes?: string;
};

// check if medication is scheduled for a given date
export function isMedicationScheduledForDate(med: Medication, targetDate: Date): boolean {
    if (!med.isActive) {
        return false;
    }

    const start = new Date(med.startDate);
    start.setHours(0, 0, 0, 0);

    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    if (target < start) {
        return false;
    }

    if (med.endDate) {
        const end = new Date(med.endDate);
        end.setHours(0, 0, 0, 0);
        if (target > end) {
            return false;
        }
    }

    const { type, specificDays, intervalDays } = med.frequency;

    if (type === 'daily' || type === 'as needed (PRN)') {
        return true;
    }

    if (type === 'specific days' && specificDays) {
        const currentDayName = WEEKDAYS[target.getDay()];
        return specificDays.includes(currentDayName);
    }

    if (type === 'interval' && intervalDays) {
        const diffTime = Math.abs(target.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (24 * 60 * 60 * 1000));
        return diffDays % intervalDays === 0;
    }

    return false;
}

// sync local triggers for today's active medications
// called whenever medications are fetched created edited or deleted.
export async function syncTodayReminders(medications: Medication[]): Promise<void> {
    try {
        // clear existing local scheduled notifications to avoid duplicate stacking
        await Notifications.cancelAllScheduledNotificationsAsync();

        const now = new Date();
        const todayMeds = medications.filter(med => isMedicationScheduledForDate(med, now));

        for (const med of todayMeds) {
            if (med.frequency.type === "as needed (PRN)" || !med.schedule) {
                continue;
            }

            for (const slot of med.schedule) {
                if (!slot.time) {
                    continue;
                }

                const [hoursStr, minutesStr] = slot.time.split(':');
                const hours = parseInt(hoursStr, 10);
                const mins = parseInt(minutesStr, 10);

                const triggerDate = new Date();
                triggerDate.setHours(hours, mins, 0, 0);

                // only schedule notifications for times later today
                if (triggerDate > now) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `⏰ Medication Reminder: ${med.name}`,
                            body: `It's time to take your ${med.dosage.value}${med.dosage.unit} dosage.`,
                            data: {
                                type: 'PRIMARY_REMINDER',
                                medicationId: med._id,
                                scheduledTime: slot.time
                            },
                            sound: 'default',
                        },
                        trigger: {
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                            date: triggerDate,
                            channelId: 'default',
                        },
                    });
                }
            }
        }
        console.log("Local reminders updated for today.");
    } catch (err) {
        console.error("Failed to sync local notifications: ", err);
    }
}