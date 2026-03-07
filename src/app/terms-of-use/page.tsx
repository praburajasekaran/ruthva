import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Ruthva Terms of Use - Legal terms and conditions for using our services",
};

export default function TermsOfUsePage() {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 lg:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold text-text-primary">
            Terms of Use
          </h1>
          <p className="text-text-secondary">
            Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-8">
          <p className="mb-4 text-text-secondary">
            Welcome to Ruthva ("Company," "we," "us," "our"). These Terms of Use
            ("Terms") govern your access to and use of our website, mobile
            application, and services (collectively, "Services"). By accessing
            or using Ruthva, you agree to be bound by these Terms.
          </p>
          <p className="text-text-secondary">
            If you do not agree with these Terms, you may not use our Services.
            Please read these Terms carefully before proceeding.
          </p>
        </section>

        {/* 1. Services Overview */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            1. Services Overview
          </h2>
          <p className="mb-4 text-text-secondary">
            Ruthva provides a patient management and treatment continuity
            platform for Ayurveda clinics and practitioners. Our Services enable
            doctors and clinic staff to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Track patient medical history and treatment records
            </li>
            <li className="ml-4 list-disc">
              Manage patient visits and follow-up appointments
            </li>
            <li className="ml-4 list-disc">
              Maintain clinic operations and staff management
            </li>
            <li className="ml-4 list-disc">
              Generate analytics and reporting for clinic performance
            </li>
            <li className="ml-4 list-disc">
              Communicate with patients regarding treatment continuity
            </li>
          </ul>
        </section>

        {/* 2. User Eligibility and Accounts */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            2. User Eligibility and Accounts
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Eligibility
              </h3>
              <p className="text-text-secondary">
                You represent and warrant that you are at least 18 years old and
                have the legal authority to enter into this agreement. By using
                Ruthva, you confirm that:
              </p>
              <ul className="mt-3 space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  You are a licensed healthcare practitioner (Ayurveda doctor) or
                  authorized clinic staff
                </li>
                <li className="ml-4 list-disc">
                  You have the authority to use Ruthva on behalf of your clinic
                </li>
                <li className="ml-4 list-disc">
                  You comply with all applicable healthcare laws and regulations
                </li>
                <li className="ml-4 list-disc">
                  You will use Ruthva in compliance with your professional
                  obligations
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Account Registration
              </h3>
              <p className="mb-3 text-text-secondary">
                To use Ruthva, you must register an account and provide accurate,
                complete information. You agree to:
              </p>
              <ul className="space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Provide true, accurate, and complete information
                </li>
                <li className="ml-4 list-disc">
                  Keep your account information current and accurate
                </li>
                <li className="ml-4 list-disc">
                  Maintain the confidentiality of your login credentials
                </li>
                <li className="ml-4 list-disc">
                  Not share your account with unauthorized persons
                </li>
                <li className="ml-4 list-disc">
                  Notify us immediately of unauthorized access to your account
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Account Responsibility
              </h3>
              <p className="text-text-secondary">
                You are responsible for all activities conducted through your
                account and for maintaining the security of your credentials. We
                are not liable for unauthorized access resulting from your
                failure to protect your login information.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Acceptable Use */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            3. Acceptable Use
          </h2>
          <p className="mb-4 text-text-secondary">
            You agree to use Ruthva only for lawful purposes and in accordance
            with these Terms. You agree not to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Violate any applicable laws, regulations, or professional codes of
              conduct
            </li>
            <li className="ml-4 list-disc">
              Use Ruthva for any unauthorized or unlawful purpose
            </li>
            <li className="ml-4 list-disc">
              Access or attempt to access systems or data not intended for you
            </li>
            <li className="ml-4 list-disc">
              Reverse engineer, decompile, or attempt to derive the source code
              of our platform
            </li>
            <li className="ml-4 list-disc">
              Interfere with or disrupt the functionality of our Services
            </li>
            <li className="ml-4 list-disc">
              Transmit malware, viruses, or any harmful code
            </li>
            <li className="ml-4 list-disc">
              Spam, harass, abuse, or threaten other users
            </li>
            <li className="ml-4 list-disc">
              Collect or harvest data from Ruthva without authorization
            </li>
            <li className="ml-4 list-disc">
              Share patient information outside authorized channels
            </li>
            <li className="ml-4 list-disc">
              Violate patient privacy or breach doctor-patient confidentiality
            </li>
          </ul>
        </section>

        {/* 4. Patient Data and Privacy */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            4. Patient Data and Privacy
          </h2>
          <p className="mb-4 text-text-secondary">
            You acknowledge that Ruthva processes sensitive patient health
            information. You agree to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Comply with HIPAA, GDPR, and all applicable healthcare privacy laws
            </li>
            <li className="ml-4 list-disc">
              Maintain patient confidentiality and informed consent
            </li>
            <li className="ml-4 list-disc">
              Only access patient data necessary for legitimate treatment purposes
            </li>
            <li className="ml-4 list-disc">
              Not disclose patient information to unauthorized third parties
            </li>
            <li className="ml-4 list-disc">
              Report any data breaches or unauthorized access immediately
            </li>
            <li className="ml-4 list-disc">
              Use Ruthva solely for legitimate clinical and administrative
              purposes
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            For detailed information on how we handle patient data, please refer
            to our Privacy Policy.
          </p>
        </section>

        {/* 5. Intellectual Property Rights */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            5. Intellectual Property Rights
          </h2>
          <p className="mb-4 text-text-secondary">
            Ruthva and all its contents, including but not limited to text,
            graphics, logos, images, software, and code, are the exclusive
            property of Ruthva and protected by copyright, trademark, and other
            intellectual property laws.
          </p>
          <p className="mb-4 text-text-secondary">
            You are granted a limited, non-exclusive, non-transferable license
            to access and use Ruthva solely for your authorized business
            purposes. You agree not to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Copy, modify, or create derivative works
            </li>
            <li className="ml-4 list-disc">
              Reproduce, distribute, or transmit Ruthva's content
            </li>
            <li className="ml-4 list-disc">
              Use our trademarks, logos, or branding without permission
            </li>
            <li className="ml-4 list-disc">
              Sublicense or transfer your rights to others
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            Your data and patient records remain your property. We grant you a
            license to store and access this information through Ruthva in
            accordance with these Terms.
          </p>
        </section>

        {/* 6. User-Generated Content */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            6. User-Generated Content
          </h2>
          <p className="mb-4 text-text-secondary">
            You retain all rights to content you create on Ruthva (patient
            records, notes, treatment plans). By using Ruthva, you grant us a
            license to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Store and process your data to provide Services
            </li>
            <li className="ml-4 list-disc">
              Use aggregated, anonymized data for analytics and service
              improvement
            </li>
            <li className="ml-4 list-disc">
              Back up your data for security and disaster recovery
            </li>
            <li className="ml-4 list-disc">
              Comply with legal obligations and regulatory requirements
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            You are responsible for ensuring patient data you enter is accurate,
            lawfully obtained, and properly consented to.
          </p>
        </section>

        {/* 7. Fees and Payment */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            7. Fees and Payment
          </h2>
          <p className="mb-4 text-text-secondary">
            Ruthva may offer subscription plans with associated fees. You agree
            to:
          </p>
          <ul className="space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Pay all fees according to the pricing plan you selected
            </li>
            <li className="ml-4 list-disc">
              Maintain current billing information
            </li>
            <li className="ml-4 list-disc">
              Pay any applicable taxes
            </li>
            <li className="ml-4 list-disc">
              Acknowledge that fees are non-refundable except as legally required
            </li>
          </ul>
          <p className="mt-4 text-text-secondary">
            We may change pricing with 30 days' notice. Continued use of Ruthva
            after a price change constitutes acceptance of the new fees.
          </p>
        </section>

        {/* 8. Disclaimer of Warranties */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            8. Disclaimer of Warranties
          </h2>
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-text-secondary">
              RUTHVA IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF
              ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES
              INCLUDING, BUT NOT LIMITED TO:
            </p>
            <ul className="mt-3 space-y-2 text-text-secondary">
              <li className="ml-4 list-disc">
                MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE
              </li>
              <li className="ml-4 list-disc">
                TITLE, NON-INFRINGEMENT, OR DATA ACCURACY
              </li>
              <li className="ml-4 list-disc">
                UNINTERRUPTED OR ERROR-FREE SERVICE
              </li>
            </ul>
            <p className="mt-3 text-text-secondary">
              WE DO NOT WARRANT THAT RUTHVA WILL BE SECURE, TIMELY, OR RELIABLE.
            </p>
          </div>
        </section>

        {/* 9. Limitation of Liability */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            9. Limitation of Liability
          </h2>
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="mb-3 text-text-secondary">
              TO THE FULLEST EXTENT PERMITTED BY LAW, RUTHVA SHALL NOT BE LIABLE
              FOR:
            </p>
            <ul className="space-y-2 text-text-secondary">
              <li className="ml-4 list-disc">
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
              </li>
              <li className="ml-4 list-disc">
                LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITY
              </li>
              <li className="ml-4 list-disc">
                ANY DAMAGES EXCEEDING THE FEES PAID IN THE PAST 12 MONTHS
              </li>
              <li className="ml-4 list-disc">
                UNAUTHORIZED ACCESS OR LOSS OF PATIENT DATA (EXCEPT WHERE WE ARE
                DIRECTLY NEGLIGENT)
              </li>
            </ul>
            <p className="mt-3 text-text-secondary">
              SOME JURISDICTIONS DO NOT ALLOW LIMITATION OF LIABILITY, SO THIS
              CLAUSE MAY NOT APPLY TO YOU.
            </p>
          </div>
        </section>

        {/* 10. Indemnification */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            10. Indemnification
          </h2>
          <p className="text-text-secondary">
            You agree to indemnify and hold harmless Ruthva, its affiliates, and
            their respective officers, directors, employees, and agents from any
            claims, damages, losses, or expenses (including attorney fees)
            arising from:
          </p>
          <ul className="mt-3 space-y-2 text-text-secondary">
            <li className="ml-4 list-disc">
              Your use of Ruthva or violation of these Terms
            </li>
            <li className="ml-4 list-disc">
              Your breach of applicable laws or regulations
            </li>
            <li className="ml-4 list-disc">
              Patient claims related to your use of patient data
            </li>
            <li className="ml-4 list-disc">
              Unauthorized disclosure of patient information by you
            </li>
            <li className="ml-4 list-disc">
              Infringement of third-party rights by your content
            </li>
          </ul>
        </section>

        {/* 11. Modifications and Termination */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            11. Modifications and Termination
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Service Modifications
              </h3>
              <p className="text-text-secondary">
                We may modify, suspend, or discontinue Ruthva or any features at
                any time. We will provide notice of material changes where
                reasonably possible.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Account Termination
              </h3>
              <p className="text-text-secondary">
                We may terminate your account if you:
              </p>
              <ul className="mt-2 space-y-2 text-text-secondary">
                <li className="ml-4 list-disc">
                  Violate these Terms or applicable laws
                </li>
                <li className="ml-4 list-disc">
                  Engage in harmful, illegal, or unethical conduct
                </li>
                <li className="ml-4 list-disc">
                  Breach patient confidentiality or healthcare regulations
                </li>
                <li className="ml-4 list-disc">
                  Fail to pay required fees
                </li>
              </ul>
              <p className="mt-3 text-text-secondary">
                You may terminate your account by submitting a termination
                request through your account settings or by contacting support.
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-text-primary">
                Data After Termination
              </h3>
              <p className="text-text-secondary">
                Upon termination, your access to Ruthva will be revoked. We will
                handle your data according to our Data Deletion Policy and
                applicable law. Some data may be retained for legal compliance.
              </p>
            </div>
          </div>
        </section>

        {/* 12. Governing Law and Dispute Resolution */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            12. Governing Law and Dispute Resolution
          </h2>
          <p className="mb-4 text-text-secondary">
            These Terms are governed by and construed in accordance with the laws
            applicable in your jurisdiction, without regard to conflicts of law
            principles.
          </p>
          <p className="mb-4 text-text-secondary">
            Any dispute arising from these Terms or Ruthva will be resolved
            through negotiation and mutual agreement. If a dispute cannot be
            resolved, you agree to submit to the exclusive jurisdiction of the
            courts in your jurisdiction.
          </p>
        </section>

        {/* 13. Severability */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            13. Severability
          </h2>
          <p className="text-text-secondary">
            If any provision of these Terms is found to be invalid or
            unenforceable, that provision will be removed or modified to the
            minimum extent necessary, and the remaining provisions will remain
            in full force and effect.
          </p>
        </section>

        {/* 14. Entire Agreement */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            14. Entire Agreement
          </h2>
          <p className="text-text-secondary">
            These Terms, together with our Privacy Policy and any other policies
            we may provide, constitute the entire agreement between you and
            Ruthva regarding your use of our Services. These Terms supersede all
            prior negotiations, understandings, and agreements.
          </p>
        </section>

        {/* 15. Changes to Terms */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            15. Changes to These Terms
          </h2>
          <p className="text-text-secondary">
            We may update these Terms at any time. Material changes will be
            communicated via email or by posting a notice on our website. Your
            continued use of Ruthva following notice of changes constitutes your
            acceptance of the updated Terms.
          </p>
        </section>

        {/* 16. Contact Us */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            16. Contact Information
          </h2>
          <p className="mb-4 text-text-secondary">
            If you have questions about these Terms or need to contact us:
          </p>
          <div className="space-y-2 rounded-lg bg-surface-secondary p-6 text-text-secondary">
            <p>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@ruthva.com"
                className="text-brand-600 hover:underline"
              >
                support@ruthva.com
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
          <p className="mb-4 text-text-secondary">
            Related policies:
            <a
              href="/privacy-policy"
              className="ml-1 text-brand-600 hover:underline"
            >
              Privacy Policy
            </a>
            {" | "}
            <a
              href="/data-deletion"
              className="text-brand-600 hover:underline"
            >
              Data Deletion
            </a>
          </p>
          <p className="text-sm text-text-muted">
            © 2024 Ruthva. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
