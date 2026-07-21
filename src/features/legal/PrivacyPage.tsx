import { LegalLayout, LegalSection } from "@/shared/layout/LegalLayout";

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <LegalSection heading="1. Who we are">
        <p>
          CareerPilot AI ("CareerPilot", "we", "us") is a product operated under Operix. This
          policy explains what personal information we collect through the CareerPilot AI
          application, how we use it, and the choices you have.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account information</strong> — the email address and password you use to sign
            up, and any display name you provide.
          </li>
          <li>
            <strong>Resume content</strong> — the resume file you upload (PDF or DOCX) and the
            text extracted from it.
          </li>
          <li>
            <strong>Resume Builder details</strong> — if you use this module, structured
            information you provide or approve, including your name, email, phone number,
            location, LinkedIn/portfolio links, work history, education, skills, and
            certifications.
          </li>
          <li>
            <strong>Job description text</strong> — content you paste into the JD Analyzer.
          </li>
          <li>
            <strong>Interview practice content</strong> — your typed or spoken (then transcribed)
            answers during mock interview practice, and the AI-generated feedback on them.
          </li>
          <li>
            <strong>Usage information</strong> — which features you use and when, so we can
            enforce free-plan usage limits and maintain the service.
          </li>
          <li>
            <strong>Local preferences</strong> — settings like light/dark theme are stored only in
            your browser, not on our servers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <p>We use your information solely to operate CareerPilot AI, specifically to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Generate the resume analysis, job-match, interview questions, and resume documents you request</li>
          <li>Maintain your account and keep you signed in</li>
          <li>Enforce the usage limits associated with your plan</li>
          <li>Diagnose and fix technical problems</li>
        </ul>
        <p>We do not sell your personal information, and we do not use your content to train our own AI models.</p>
      </LegalSection>

      <LegalSection heading="4. Third parties that process your information">
        <p>
          To provide the service, the content you submit is processed by the following
          infrastructure and AI providers, under their own security and data-handling terms:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Supabase</strong> — hosts our database, handles sign-in, and stores uploaded
            resume files.
          </li>
          <li>
            <strong>Anthropic (Claude API)</strong> — your resume text, pasted job descriptions,
            and interview answers are sent to Anthropic's Claude models to generate the analysis
            and feedback you see in the app. Anthropic does not use API content to train its
            models by default.
          </li>
        </ul>
        <p>
          We do not currently use third-party advertising or tracking cookies. If we introduce
          privacy-respecting product analytics in the future, we will update this policy first.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention and deletion">
        <p>
          We retain your information for as long as your account is active. To request deletion
          of your account and associated data, contact us at the email below — we do not yet have
          a self-service delete button in the app, so this is handled manually on request.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>
          Subject to applicable law, including India's Digital Personal Data Protection Act, you
          may request access to, correction of, or deletion of your personal information by
          contacting us using the details below.
        </p>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>
          Your data is encrypted in transit and at rest. Access to your data within our database
          is restricted so that only you can read or modify your own records, enforced at the
          database level, not just in the application.
        </p>
      </LegalSection>

      <LegalSection heading="8. Children's privacy">
        <p>
          CareerPilot AI is intended for users aged 18 and over. We do not knowingly collect
          information from anyone under 18.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to this policy">
        <p>
          We may update this policy as the product changes. We'll update the "Last updated" date
          above when we do.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact us">
        <p>
          Questions about this policy, or requests regarding your data, can be sent to{" "}
          <span className="font-medium">[support email to be added]</span>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
