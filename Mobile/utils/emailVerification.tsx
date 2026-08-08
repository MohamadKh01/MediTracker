import { BASE_URL } from "../constants/api";

export interface verifyEmailPayload {
    email: string;
    code: string;
}

export interface ResendCodePayload {
    email: string;
}

export const emailVerification = async (payload: verifyEmailPayload) => {
    const res = await fetch(`${BASE_URL}/api/auth/verifyEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email, code: payload.code }),
    });

    const result = await res.json();
    if (!result.success) {
        throw new Error(result.message || "Verification failed");
    }

    return result;
}

export const resendVerification = async (payload: ResendCodePayload) => {
    const res = await fetch(`${BASE_URL}/api/auth/resendVerification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payload.email }),
    });

    const result = await res.json();
    if (!result.success) {
        throw new Error(result.message || "resend code failed");
    }

    return result;
}