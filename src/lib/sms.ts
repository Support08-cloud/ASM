type SmsResult = {
  delivered: boolean;
  channel: "msg91" | "demo";
  error?: string;
};

export async function sendOtpSms(input: {
  phone: string;
  otp: string;
  authKey?: string;
  templateId?: string;
  senderId?: string;
}): Promise<SmsResult> {
  const key = input.authKey?.trim();
  if (!key) {
    return { delivered: false, channel: "demo" };
  }

  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        authkey: key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        template_id: input.templateId || undefined,
        sender: input.senderId || "V360ASM",
        mobile: normalizePhone(input.phone),
        otp: input.otp,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { delivered: false, channel: "msg91", error: text.slice(0, 200) };
    }
    return { delivered: true, channel: "msg91" };
  } catch (error) {
    return {
      delivered: false,
      channel: "msg91",
      error: error instanceof Error ? error.message : "SMS failed",
    };
  }
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function whatsappOtpLink(phone: string, otp: string, minutes = 5): string {
  const mobile = normalizePhone(phone);
  const text = `Vision 360 PIN reset OTP: ${otp}. Do not share this code. Valid ${minutes} min.`;
  return `https://wa.me/${mobile}?text=${encodeURIComponent(text)}`;
}
