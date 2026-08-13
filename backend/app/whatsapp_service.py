"""
WhatsApp Service - stub implementation.

Provides a WhatsAppClient class for sending WhatsApp messages.
Currently a no-op stub that logs to stdout.
Replace _send_via_twilio when ready for production.
"""

import os
import logging

logger = logging.getLogger(__name__)


class WhatsAppClient:
    """Minimal WhatsApp messaging client.

    Env vars:
        TWILIO_ACCOUNT_SID  - Twilio account SID
        TWILIO_AUTH_TOKEN   - Twilio auth token
        TWILIO_WHATSAPP_FROM - sender number (default: whatsapp:+14155238886)
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    def send_message(self, to: str, body: str) -> bool:
        """Send a WhatsApp message."""
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"
        if self.account_sid and self.auth_token:
            return self._send_via_twilio(to, body)
        logger.info("[WhatsApp STUB] To: %s | Message: %s", to, body)
        print(f"[WhatsApp STUB] To: {to} | Message: {body}")
        return True

    def send_otp(self, to: str, code: str) -> bool:
        """Send OTP message via WhatsApp."""
        body = (
            f"Your Girvi Management OTP is: {code}\n"
            "Valid for 5 minutes. Do not share with anyone."
        )
        return self.send_message(to, body)

    def send_girvi_confirmation(self, to: str, pledge_no: str, customer_name: str, amount: float) -> bool:
        """Send a Girvi pledge confirmation to the customer."""
        body = (
            f"Dear {customer_name},\n"
            f"Your Girvi pledge #{pledge_no} of Rs.{amount:,.2f} has been recorded.\n"
            "Contact us at your nearest branch for any queries."
        )
        return self.send_message(to, body)

    def _send_via_twilio(self, to: str, body: str) -> bool:
        """Send using Twilio SDK."""
        try:
            from twilio.rest import Client  # type: ignore
            client = Client(self.account_sid, self.auth_token)
            message = client.messages.create(body=body, from_=self.from_number, to=to)
            logger.info("[WhatsApp] Sent SID: %s", message.sid)
            return True
        except ImportError:
            logger.warning("[WhatsApp] twilio not installed, using stub.")
            print(f"[WhatsApp STUB] To: {to} | Message: {body}")
            return True
        except Exception as exc:
            logger.error("[WhatsApp] Failed: %s", exc)
            return False
