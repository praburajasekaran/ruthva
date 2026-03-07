import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: "Ruthva Data Deletion - How to request deletion of your data",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-text-primary">
            Data Deletion Request
          </h1>
          <p className="text-text-secondary">
            Learn how to request the deletion of your personal data from Ruthva
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <p className="text-text-secondary">
            At Ruthva, we respect your privacy rights and provide you with the
            ability to request deletion of your personal data. This page explains
            how to submit a data deletion request and what happens when you do.
          </p>
        </section>

        {/* 1. Your Right to Delete Data */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            1. Your Right to Delete Data
          </h2>
          <p className="mb-4 text-text-secondary">
            Under privacy regulations including GDPR, CCPA, and other applicable
            laws, you have the right to request deletion of your personal data.
            This right is often referred to as the "right to be forgotten."
          </p>
          <p className="text-text-secondary">
            You may request deletion of your data at any time, subject to
            certain legal and operational exceptions.
          </p>
        </section>

        {/* 2. What Data Can Be Deleted */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            2. What Data Can Be Deleted
          </h2>
          <p className="mb-4 text-text-secondary">
            When you request account deletion, the following data will be
            permanently removed:
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Account Information
              </h3>
              <ul className="space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Email address and login credentials
                </li>
                <li className="ml-4 list-disc">
                  Name and contact information
                </li>
                <li className="ml-4 list-disc">
                  Profile settings and preferences
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Clinic Information
              </h3>
              <ul className="space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Clinic details and configuration
                </li>
                <li className="ml-4 list-disc">
                  Team member associations
                </li>
                <li className="ml-4 list-disc">
                  Clinic-specific settings
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              <strong>Important:</strong> Patient medical records may be retained
              for longer periods in accordance with healthcare regulations,
              medical confidentiality laws, and applicable data protection
              standards. We cannot delete patient data that is subject to
              mandatory retention requirements.
            </p>
          </div>
        </section>

        {/* 3. Data We Cannot Delete */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            3. Data We Cannot Delete
          </h2>
          <p className="mb-4 text-text-secondary">
            Certain data may be retained even after a deletion request due to
            legal, regulatory, or operational requirements:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              <strong>Patient Medical Records:</strong> Required by healthcare
              regulations for minimum retention periods (typically 5-10 years)
            </li>
            <li className="ml-4 list-disc">
              <strong>Financial Records:</strong> Transaction data required for
              accounting, auditing, and tax compliance
            </li>
            <li className="ml-4 list-disc">
              <strong>Legal Obligations:</strong> Data retained to comply with
              laws, court orders, or regulatory requirements
            </li>
            <li className="ml-4 list-disc">
              <strong>Fraud Prevention:</strong> Information necessary to prevent
              fraud or illegal activity
            </li>
            <li className="ml-4 list-disc">
              <strong>Backup Data:</strong> Data in backup systems may take time
              to be permanently deleted according to our backup retention policy
            </li>
          </ul>
        </section>

        {/* 4. How to Request Data Deletion */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            4. How to Request Data Deletion
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Option 1: Self-Service Deletion
              </h3>
              <p className="mb-3 text-text-secondary">
                You can request account deletion directly from your account
                settings:
              </p>
              <ol className="space-y-2 text-text-secondary">
                <li className="ml-4 list-decimal">
                  Log in to your Ruthva account
                </li>
                <li className="ml-4 list-decimal">
                  Navigate to Settings → Account
                </li>
                <li className="ml-4 list-decimal">
                  Select "Request Account Deletion"
                </li>
                <li className="ml-4 list-decimal">
                  Confirm your request when prompted
                </li>
              </ol>
              <p className="mt-3 text-sm text-text-muted">
                Your account will be scheduled for deletion within 30 days.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Option 2: Email Request
              </h3>
              <p className="mb-3 text-text-secondary">
                You can also submit a data deletion request via email:
              </p>
              <div className="rounded-lg bg-surface-secondary p-4">
                <p className="text-text-secondary">
                  Send an email to:{" "}
                  <a
                    href="mailto:privacy@ruthva.com"
                    className="font-semibold text-brand-600 hover:underline"
                  >
                    privacy@ruthva.com
                  </a>
                </p>
                <p className="mt-2 text-text-secondary">
                  Subject: <strong>Data Deletion Request</strong>
                </p>
                <p className="mt-2 text-text-secondary">
                  Include the following information:
                </p>
                <ul className="mt-2 space-y-1 text-text-secondary">
                  <li className="ml-4 list-disc">Your full name</li>
                  <li className="ml-4 list-disc">
                    Email address associated with your account
                  </li>
                  <li className="ml-4 list-disc">
                    Clinic name (if applicable)
                  </li>
                  <li className="ml-4 list-disc">
                    Reason for deletion (optional)
                  </li>
                </ul>
              </div>
            </li>
          </div>
        </section>

        {/* 5. Verification Process */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            5. Verification Process
          </h2>
          <p className="mb-4 text-text-secondary">
            To protect your account security, we will verify your identity
            before processing a data deletion request. This may include:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Confirming your email address and account details
            </li>
            <li className="ml-4 list-disc">
              Sending a verification code to your registered email
            </li>
            <li className="ml-4 list-disc">
              Verifying your identity through security questions
            </li>
            <li className="ml-4 list-disc">
              For clinic administrators, verifying administrative authority
            </li>
          </ul>
        </section>

        {/* 6. Processing Timeline */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            6. Processing Timeline
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-2 font-semibold text-text-primary">
                Request Confirmation
              </h3>
              <p className="text-text-secondary">
                Within 2 business days, we will send a confirmation email
                acknowledging your deletion request.
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-2 font-semibold text-text-primary">
                Processing Period
              </h3>
              <p className="text-text-secondary">
                Your data will be permanently deleted within 30 days of your
                confirmed request. During this period, your account will be
                deactivated and inaccessible.
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-2 font-semibold text-text-primary">
                Completion Confirmation
              </h3>
              <p className="text-text-secondary">
                Once deletion is complete, you will receive a final confirmation
                email.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Before You Delete */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            7. Important Considerations Before Deletion
          </h2>
          <div className="space-y-3 rounded-lg bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Please note:</p>
            <ul className="space-y-2">
              <li className="ml-4 list-disc">
                Data deletion is permanent and cannot be undone
              </li>
              <li className="ml-4 list-disc">
                You will lose access to all your patient records and clinic data
              </li>
              <li className="ml-4 list-disc">
                If you manage a clinic, other team members will also lose access
              </li>
              <li className="ml-4 list-disc">
                You cannot recover deleted data after 30 days
              </li>
              <li className="ml-4 list-disc">
                Export or backup your data before requesting deletion if needed
              </li>
            </ul>
          </div>
        </section>

        {/* 8. Data Export Alternative */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            8. Data Export as an Alternative
          </h2>
          <p className="mb-4 text-text-secondary">
            Before requesting deletion, you can export your data in a portable
            format. To export your data:
          </p>
          <ol className="space-y-2 text-text-secondary">
            <li className="ml-4 list-decimal">
              Log in to your account
            </li>
            <li className="ml-4 list-decimal">
              Go to Settings → Data & Privacy
            </li>
            <li className="ml-4 list-decimal">
              Click "Export My Data"
            </li>
            <li className="ml-4 list-decimal">
              You'll receive a downloadable file with all your information
            </li>
          </ol>
          <p className="mt-4 text-text-secondary">
            This allows you to maintain a copy of your data while deleting it
            from Ruthva's systems.
          </p>
        </section>

        {/* 9. Contact Us */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            9. Contact & Support
          </h2>
          <p className="mb-4 text-text-secondary">
            If you have questions about the data deletion process or need
            assistance:
          </p>
          <div className="space-y-3 rounded-lg bg-surface-secondary p-6">
            <p className="text-text-secondary">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:privacy@ruthva.com"
                className="text-brand-600 hover:underline"
              >
                privacy@ruthva.com
              </a>
            </p>
            <p className="text-text-secondary">
              <strong>Subject:</strong> Data Deletion Support
            </p>
            <p className="text-text-secondary">
              We typically respond to requests within 2 business days.
            </p>
          </div>
        </section>

        {/* 10. Your Rights */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            10. Your Legal Rights
          </h2>
          <p className="mb-4 text-text-secondary">
            You have the right to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Request deletion of your personal data
            </li>
            <li className="ml-4 list-disc">
              Receive confirmation of deletion
            </li>
            <li className="ml-4 list-disc">
              Know what data is being retained and why
            </li>
            <li className="ml-4 list-disc">
              File a complaint with your local data protection authority if you
              believe your rights have been violated
            </li>
          </ul>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-8">
          <p className="mb-4 text-text-secondary">
            For more information about how we handle your data, please read our
            <a
              href="/privacy-policy"
              className="ml-1 text-brand-600 hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p className="text-sm text-text-muted">
            © 2024 Ruthva. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
