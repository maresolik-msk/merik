# Email setup (Gmail SMTP)

Merik sends email two ways, both through the same Gmail account
**merik.msk@gmail.com** over SMTP:

1. **Supabase Auth emails** — signup confirmation, password reset, magic links.
   Configured in the Supabase dashboard.
2. **App notifications** — payslip ready, leave approved, etc. Sent by the
   `send-email` edge function.

> ⚠️ Gmail SMTP is capped at ~500 recipients/day and mail may show "via gmail".
> Fine for low volume. If sending grows, switch to a transactional provider
> (Resend/Brevo) on the `merik.in` domain for better deliverability.

---

## Step 1 — Create a Gmail App Password (one time)

The Gmail account password will **not** work for SMTP. You need an App Password.

1. On the `merik.msk@gmail.com` account, enable **2-Step Verification**
   (myaccount.google.com → Security). App Passwords require it.
2. Go to **myaccount.google.com/apppasswords**.
3. Create a password named `Merik SMTP`. Google shows a **16-character** code
   (e.g. `abcd efgh ijkl mnop`). Copy it **without spaces** → `abcdefghijklmnop`.
4. Keep it secret. It goes only into the two dashboards below — never into git.

---

## Step 2 — Supabase Auth emails (dashboard)

Supabase dashboard → project **doms-global** → **Authentication → Emails →
SMTP Settings** → enable custom SMTP:

| Field           | Value                          |
| --------------- | ------------------------------ |
| Sender email    | `merik.msk@gmail.com`          |
| Sender name     | `Merik`                        |
| Host            | `smtp.gmail.com`               |
| Port            | `465`                          |
| Username        | `merik.msk@gmail.com`          |
| Password        | *the 16-char App Password*     |
| Minimum interval | leave default                 |

Save, then use **Send test email**. Also review the templates under
**Authentication → Emails → Templates** so they read as Merik.

---

## Step 3 — App notification function (`send-email`)

The edge function is in `supabase/functions/send-email/`. It only lets an
authenticated **admin/superadmin** send, and a tenant admin can only email an
address that belongs to an employee in their own org.

### 3a. Set the function secrets

Dashboard → **Edge Functions → Secrets** (or CLI below). `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do **not** add them.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=merik.msk@gmail.com
SMTP_PASS=<16-char App Password>
SMTP_FROM=Merik <merik.msk@gmail.com>
```

CLI alternative:

```bash
supabase secrets set \
  SMTP_HOST=smtp.gmail.com SMTP_PORT=465 \
  SMTP_USER=merik.msk@gmail.com SMTP_PASS=xxxxxxxxxxxxxxxx \
  "SMTP_FROM=Merik <merik.msk@gmail.com>" \
  --project-ref cohifrzskydnozpmieov
```

### 3b. Deploy

```bash
supabase functions deploy send-email --project-ref cohifrzskydnozpmieov
```

### 3c. Call it from the app

```ts
const { data, error } = await supabase.functions.invoke("send-email", {
  body: {
    to: "employee@example.com",
    subject: "Your July payslip is ready",
    html: "<p>Hi, your payslip for July is now available in Merik.</p>",
  },
});
```

The user's session token is sent automatically, so the function sees who is
calling and enforces the admin + same-org checks.

---

## Verifying it works

- **Auth:** trigger a password reset from the login page → the email should
  arrive from `merik.msk@gmail.com`.
- **Notifications:** as an admin, invoke `send-email` to one of your employees
  and confirm delivery. A `{ error: ... }` response means auth/validation failed;
  check the function logs in the dashboard.
