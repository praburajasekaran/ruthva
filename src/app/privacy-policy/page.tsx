import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Ruthva Privacy Policy - Learn how we protect your data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="text-text-secondary">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-8">
          <p className="mb-4 text-text-secondary">
            Ruthva ("we," "us," "our," or "Company") is committed to protecting
            your privacy. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you visit our website
            and use our services.
          </p>
          <p className="text-text-secondary">
            Please read this Privacy Policy carefully. If you do not agree with
            our policies and practices, please do not use our services.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            1. Information We Collect
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Information You Provide Directly
              </h3>
              <p className="mb-3 text-text-secondary">
                When you register for an account, log in, or use our services,
                we collect:
              </p>
              <ul className="space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Account information: name, email address, phone number,
                  organization name
                </li>
                <li className="ml-4 list-disc">
                  Clinic information: clinic name, location, specialization
                </li>
                <li className="ml-4 list-disc">
                  Patient data: medical history, treatment records, visit
                  information (for doctors managing patient care)
                </li>
                <li className="ml-4 list-disc">
                  Communication data: messages, feedback, and support requests
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Information Collected Automatically
              </h3>
              <p className="mb-3 text-text-secondary">
                When you interact with our platform, we automatically collect:
              </p>
              <ul className="space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Device information: IP address, browser type, operating
                  system, device ID
                </li>
                <li className="ml-4 list-disc">
                  Usage data: pages visited, features used, time spent,
                  interactions
                </li>
                <li className="ml-4 list-disc">
                  Location data: approximate location based on IP address
                </li>
                <li className="ml-4 list-disc">
                  Cookies and tracking technologies for authentication and
                  analytics
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            2. How We Use Your Information
          </h2>
          <p className="mb-4 text-text-secondary">
            We use the information we collect to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Provide, operate, and maintain our services
            </li>
            <li className="ml-4 list-disc">
              Enable patient care continuity and treatment tracking
            </li>
            <li className="ml-4 list-disc">
              Process transactions and send service-related communications
            </li>
            <li className="ml-4 list-disc">
              Improve and optimize our platform and user experience
            </li>
            <li className="ml-4 list-disc">
              Conduct analytics and understand how our services are used
            </li>
            <li className="ml-4 list-disc">
              Ensure security and prevent fraud
            </li>
            <li className="ml-4 list-disc">
              Comply with legal obligations
            </li>
            <li className="ml-4 list-disc">
              Send administrative and marketing communications (with your
              consent)
            </li>
          </ul>
        </section>

        {/* 3. Information Sharing */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            3. Information Sharing and Disclosure
          </h2>
          <p className="mb-4 text-text-secondary">
            We do not sell, trade, or rent your personal information. We may
            share your information in the following situations:
          </p>

          <div className="space-y-4 text-text-secondary">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Service Providers
              </h3>
              <p>
                We share information with third-party service providers who
                assist us in operating our website, conducting business, or
                servicing you (such as hosting, analytics, payment processing,
                support).
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Professional Team Members
              </h3>
              <p>
                If you work at a clinic, authorized team members may access
                patient data as needed for treatment continuity and clinic
                operations.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Legal Requirements
              </h3>
              <p>
                We may disclose information when required by law or in response
                to legal processes, court orders, or governmental requests.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Business Transfers
              </h3>
              <p>
                If Ruthva is involved in a merger, acquisition, bankruptcy, or
                asset sale, your information may be transferred as part of that
                transaction.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Data Security */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            4. Data Security
          </h2>
          <p className="text-text-secondary">
            We implement appropriate technical, administrative, and physical
            safeguards to protect your information from unauthorized access,
            alteration, disclosure, or destruction. These include:
          </p>
          <ul className="mt-4 space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Encryption of data in transit (HTTPS/TLS)
            </li>
            <li className="ml-4 list-disc">
              Secure authentication mechanisms
            </li>
            <li className="ml-4 list-disc">
              Access controls and role-based permissions
            </li>
            <li className="ml-4 list-disc">
              Regular security assessments and updates
            </li>
            <li className="ml-4 list-disc">
              Limited access to personal information on a need-to-know basis
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            However, no method of transmission over the internet is completely
            secure. We cannot guarantee absolute security of your information.
          </p>
        </section>

        {/* 5. Data Retention */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            5. Data Retention
          </h2>
          <p className="text-text-secondary">
            We retain your information for as long as necessary to provide our
            services, comply with legal obligations, and resolve disputes. The
            retention period may vary depending on the type of information and
            its purpose. Patient medical records are retained in accordance with
            applicable healthcare regulations.
          </p>
          <p className="mt-4 text-text-secondary">
            You may request deletion of your account and associated data by
            contacting us, subject to legal and operational requirements.
          </p>
        </section>

        {/* 6. Your Privacy Rights */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            6. Your Privacy Rights
          </h2>
          <p className="mb-4 text-text-secondary">
            Depending on your location, you may have certain rights regarding
            your personal information:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Right to access your personal information
            </li>
            <li className="ml-4 list-disc">
              Right to correct inaccurate information
            </li>
            <li className="ml-4 list-disc">
              Right to delete your information
            </li>
            <li className="ml-4 list-disc">
              Right to opt-out of certain processing
            </li>
            <li className="ml-4 list-disc">
              Right to data portability
            </li>
            <li className="ml-4 list-disc">
              Right to withdraw consent
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            To exercise these rights, please contact us at the address below.
          </p>
        </section>

        {/* 7. Cookies and Tracking */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            7. Cookies and Tracking Technologies
          </h2>
          <p className="mb-4 text-text-secondary">
            We use cookies and similar tracking technologies to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Remember your login information and preferences
            </li>
            <li className="ml-4 list-disc">
              Understand how you use our platform
            </li>
            <li className="ml-4 list-disc">
              Improve our services and personalize your experience
            </li>
            <li className="ml-4 list-disc">
              Provide security features
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            You can control cookies through your browser settings. However,
            disabling cookies may affect the functionality of our services.
          </p>
        </section>

        {/* 8. Children's Privacy */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            8. Children's Privacy
          </h2>
          <p className="text-text-secondary">
            Ruthva is not intended for children under 13. We do not knowingly
            collect personal information from children under 13. If we become
            aware that a child under 13 has provided us with personal
            information, we will delete such information promptly.
          </p>
        </section>

        {/* 9. Third-Party Links */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            9. Third-Party Links
          </h2>
          <p className="text-text-secondary">
            Our services may contain links to third-party websites and services.
            This Privacy Policy applies only to our services. We are not
            responsible for the privacy practices of third-party websites. We
            encourage you to review their privacy policies before providing any
            personal information.
          </p>
        </section>

        {/* 10. Changes to Privacy Policy */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            10. Changes to This Privacy Policy
          </h2>
          <p className="text-text-secondary">
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new Privacy Policy on
            our website and updating the "Last Updated" date. Your continued
            use of our services after changes constitutes your acceptance of the
            updated Privacy Policy.
          </p>
        </section>

        {/* 11. Contact Us */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            11. Contact Us
          </h2>
          <p className="mb-4 text-text-secondary">
            If you have questions or concerns about this Privacy Policy or our
            privacy practices, please contact us at:
          </p>
          <div className="space-y-2 rounded-lg bg-surface-secondary p-6 text-text-secondary">
            <p>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:privacy@ruthva.com"
                className="text-brand-600 hover:underline"
              >
                privacy@ruthva.com
              </a>
            </p>
            <p>
              <strong>Website:</strong>{" "}
              <a
                href="https://ruthva.com"
                className="text-brand-600 hover:underline"
              >
                https://ruthva.com
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border pt-8">
          <p className="text-sm text-text-muted">
            © 2024 Ruthva. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
