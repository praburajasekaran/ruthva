# Sivanethram: AYUSH SaaS Multi-Tenant Clinic Platform

**Sivanethram** is a B2B SaaS platform specifically designed for clinics practicing AYUSH disciplines (Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy). It provides a full-featured clinic management system with multi-tenancy, enabling independent clinics to operate on their own subdomains with isolated data, branding, and role-based access.

## 🏗️ Architecture & Tech Stack

The application uses a modern, decoupled architecture:
- **Backend**: Django 5.1 with Django REST Framework (DRF).
  - **Database**: PostgreSQL (`psycopg2-binary`).
  - **Authentication**: JWT (`djangorestframework-simplejwt`).
  - **PDF Generation**: `weasyprint` for generating A4/A5 medical prescriptions and reports.
  - **Email Service**: Resend API ([resend](file:///Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/reminders/email.py#9-11)) for follow-up reminders and invitations.
  - **Storage**: Cloudflare R2 for storing clinic branding assets (logos).
- **Frontend**: Next.js 14.2 (App Router) with React 18.
  - **Styling**: Tailwind CSS.
  - **Icons**: `lucide-react`.
  - **API Client**: `axios`.

## 📦 Core Modules

1. **Clinics & Multi-Tenancy (`clinics` app)**
   - Clinics get dedicated subdomains (e.g., `myclinic.sivanethram.com`).
   - Supports heavy branding customization: custom logos, primary colors, tagline, address.
   - Paper size preferences (A4 vs. A5) for printing.
   - Role-based team invitations: Clinics can invite members with specific roles (Admin, Doctor, Therapist) via expirable UUID tokens.

2. **Patients (`patients` app)**
   - Stores detailed patient demographic data, habits, family history, and medical records.
   - Auto-generates unique IDs per clinic (e.g., `PAT-2026-0001`).
   - Calculates dynamic age based on DOB.
   - Data import/export: robust features for CSV validation and bulk ZIP exporting.

3. **Consultations & Diagnostics (`consultations` app)**
   - Tracks vitals (weight, BP, temp, pulse).
   - Captures subjective assessments (appetite, bowel, sleep patterns).
   - **Discipline-Specific Diagnostics**: Stores unstructured diagnostic data in custom JSONFields, easily adapting to specific practices (e.g., *Envagai Thervu* for Siddha, *Prakriti* for Ayurveda).

4. **Prescriptions (`prescriptions` app)**
   - Connects 1:1 with a consultation.
   - Handles detailed medication tracking with frequency, dosage, and duration.
   - Built-in bilingual support (e.g., Tamil translation: "OD" -> "ஒரு முறை" / Once daily).
   - Follow-up dates and specialized diets, exercise, or lifestyle modifications.
   - Records discrete "Procedure Entries" for therapies.

5. **Reminders & Communications (`reminders` app)**
   - Tracks follow-ups and automatically dispatches contextual emails to patients using Resend.

## 🚀 Development Roadmap & Current Status

* **Completed (Phases 1-4)**: The core multi-tenant framework is fully live. This includes tenant isolation, JWT authentication, team management/RBAC, custom branding/logo upload, automated PDF generations, and complete CSV data portability.
* **Upcoming (Phases 5-6)**: 
  * Granular handling of *Multi-Discipline* forms (like the Ayurveda Prakriti form rendering conditionally).
  * *Pharmacy & Usage*: Adding a comprehensive internal medicine catalog, inventory stock tracking, and usage/quota limits (e.g., blocking addition of patients if a subscription limit is reached).

## 💡 Key Differentiation & Value Proposition
Sivanethram isn't a generic EHR. It caters deeply to indigenous Indian medical systems by allowing distinct diagnostic paradigms natively in the software, alongside essential localization (like Tamil descriptions in medication frequencies), ensuring the workflow aligns with the cultural and operational reality of AYUSH practitioners.
