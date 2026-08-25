// Microsoft 365 / Outlook SMTP Configuration read from environment variables

export const smtpConfig = {
  host: import.meta.env.VITE_SMTP_HOST || 'smtp.office365.com',
  port: Number(import.meta.env.VITE_SMTP_PORT || '587'),
  user: import.meta.env.VITE_SMTP_USER || 'goutham.ra@sheshi.ai',
  senderEmail: import.meta.env.VITE_SMTP_SENDER_EMAIL || 'goutham.ra@sheshi.ai',
  senderName: import.meta.env.VITE_SMTP_SENDER_NAME || 'Sheshi Vault',
  tls: import.meta.env.VITE_SMTP_TLS || 'STARTTLS',
}
