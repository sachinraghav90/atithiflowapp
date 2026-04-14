import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const animatedLinkClass =
  "relative inline-block text-primary hover:text-primary/80 focus-visible:text-primary/80 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100";

const tocItems = [
  { id: "scope", label: "Scope" },
  { id: "information-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use your information" },
  { id: "legal-bases", label: "Legal bases" },
  { id: "how-we-share", label: "How we share information" },
  { id: "international-transfers", label: "International data transfers" },
  { id: "data-retention", label: "Data retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your rights and choices" },
  { id: "childrens-privacy", label: "Children's privacy" },
  { id: "third-party-links", label: "Third-party links" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

const PrivacyPolicy = () => {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    document.title = "Privacy Policy | AtithiFlow";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Learn how AtithiFlow collects, uses, and protects personal information."
      );
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              How AtithiFlow collects, uses, and protects your information.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: 12 December 2025
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl">
          {/* Introduction */}
          <p className="text-foreground mb-8">
            AtithiFlow ("<strong>AtithiFlow</strong>", "<strong>we</strong>", "
            <strong>us</strong>", "<strong>our</strong>") is a hospitality
            operations SaaS product provided by{" "}
            <strong>Systechnosoft</strong>. This Privacy Policy explains how we
            collect, use, share, and protect information when you visit our
            website or interact with our services.
          </p>
          <p className="text-foreground mb-8">
            If you have questions, contact us at{" "}
            <a
              href="mailto:support@atithiflow.com"
              className={animatedLinkClass}
            >
              support@atithiflow.com
            </a>
            .
          </p>

          {/* Quick Summary Card */}
          <div className="bg-muted border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick summary
            </h2>
            <ul className="space-y-2 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  We collect information you provide (e.g., when you request a
                  demo, contact us, or schedule a call).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  We use it to respond to you, provide demos, improve our
                  website, and operate our business.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  We share data with trusted service providers (e.g.,
                  scheduling, email, analytics) only as needed.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  You can request access, correction, deletion, or other rights
                  depending on your location.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  We use reasonable security safeguards to protect your
                  information.
                </span>
              </li>
            </ul>
          </div>

          {/* Table of Contents */}
          <div className="bg-white border border-border rounded-lg p-6 mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Table of Contents
            </h2>
            <nav>
              <ol className="space-y-2">
                {tocItems.map((item, index) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`text-sm ${animatedLinkClass}`}
                    >
                      {index + 1}. {item.label}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Content Sections */}
          <div className="space-y-10">
            {/* 1. Scope */}
            <section id="scope" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                1. Scope
              </h2>
              <p className="text-foreground mb-4">
                This Privacy Policy applies to:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    The AtithiFlow marketing website (the "<strong>Site</strong>
                    ")
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Demo/contact inquiries and communications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Scheduling a meeting via our booking tools</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                It does not cover third-party websites you may reach through
                links on our Site.
              </p>
            </section>

            {/* 2. Information we collect */}
            <section id="information-we-collect" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                2. Information we collect
              </h2>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                a) Information you provide
              </h3>
              <p className="text-foreground mb-3">We may collect:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Name, work email, phone number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Hotel/property name and basic business details (e.g.,
                    property size, modules of interest)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Messages you send via forms or email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Meeting details if you schedule time with us</span>
                </li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                b) Information collected automatically
              </h3>
              <p className="text-foreground mb-3">
                When you use the Site, we may automatically collect:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Device and browser information (e.g., IP address, browser
                    type, operating system)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Usage data (pages viewed, time spent, referring pages)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Approximate location derived from IP (country/region level)
                  </span>
                </li>
              </ul>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                c) Cookies and similar technologies
              </h3>
              <p className="text-foreground mb-3">
                We may use cookies or similar technologies to:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Keep the Site working properly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Remember preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Understand traffic and improve performance</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                You can control cookies through your browser settings. If we use
                a cookie banner/consent tool, you can manage preferences there
                as well.
              </p>
            </section>

            {/* 3. How we use your information */}
            <section id="how-we-use" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                3. How we use your information
              </h2>
              <p className="text-foreground mb-3">
                We use information for purposes such as:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Responding to demo requests, inquiries, and support
                    questions
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Scheduling and conducting meetings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Improving the Site, content, and user experience
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Security monitoring, fraud prevention, and protecting our
                    rights
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Complying with legal obligations</span>
                </li>
              </ul>
            </section>

            {/* 4. Legal bases */}
            <section id="legal-bases" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                4. Legal bases (where applicable)
              </h2>
              <p className="text-foreground mb-3">
                If you are in a location that requires a legal basis (e.g.,
                EEA/UK), we process personal data based on:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Consent</strong> (e.g., where required for certain
                    cookies)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Contract / pre-contract steps</strong> (e.g.,
                    responding to your demo request)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Legitimate interests</strong> (e.g., operating and
                    improving our Site, securing systems)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Legal obligations</strong> (e.g., compliance and
                    recordkeeping)
                  </span>
                </li>
              </ul>
            </section>

            {/* 5. How we share information */}
            <section id="how-we-share" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                5. How we share information
              </h2>
              <p className="text-foreground mb-3">
                We may share information with:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Service providers</strong> who help us operate the
                    Site and communicate with you (e.g., hosting, analytics,
                    email, customer support tools)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Scheduling provider (Calendly)</strong> when you
                    book a meeting. Calendly may process the information you
                    enter in the scheduling form. You should review Calendly's
                    privacy practices on their website.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Professional advisors</strong> (e.g., legal,
                    accounting) when necessary
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Authorities</strong> if required by law or to
                    protect rights and safety
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    <strong>Business transfers</strong> (e.g., merger,
                    acquisition) where information may be transferred as part of
                    the transaction
                  </span>
                </li>
              </ul>
              <p className="text-foreground mt-4 font-medium">
                We do not sell your personal information.
              </p>
            </section>

            {/* 6. International data transfers */}
            <section id="international-transfers" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                6. International data transfers
              </h2>
              <p className="text-foreground">
                If you access the Site from outside the country where our
                servers or service providers are located, your information may
                be transferred internationally. Where required, we use
                appropriate safeguards for such transfers.
              </p>
            </section>

            {/* 7. Data retention */}
            <section id="data-retention" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                7. Data retention
              </h2>
              <p className="text-foreground mb-3">
                We keep personal information only as long as needed for the
                purposes described in this policy, including:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    To respond to requests and maintain business records
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>For security and dispute resolution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>To comply with legal obligations</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                Retention periods may vary depending on the type of information
                and why it was collected.
              </p>
            </section>

            {/* 8. Security */}
            <section id="security" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                8. Security
              </h2>
              <p className="text-foreground">
                We use reasonable administrative, technical, and organizational
                safeguards designed to protect personal information. However, no
                method of transmission or storage is fully secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            {/* 9. Your rights and choices */}
            <section id="your-rights" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                9. Your rights and choices
              </h2>
              <p className="text-foreground mb-3">
                Depending on your location and applicable laws, you may have
                rights to:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Access the personal information we hold about you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Correct inaccurate information</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Request deletion</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Object to or restrict processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Withdraw consent (where processing is based on consent)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Receive a copy of your information (data portability)
                  </span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                To make a request, email{" "}
                <a
                  href="mailto:support@atithiflow.com"
                  className={animatedLinkClass}
                >
                  support@atithiflow.com
                </a>{" "}
                with the subject line: "Privacy Request". We may need to verify
                your identity before responding.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                India (DPDP) note
              </h3>
              <p className="text-foreground">
                If applicable laws in India apply, you may have rights to
                access, correction, grievance redressal, and nomination. We will
                handle requests in line with applicable requirements.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                California notice
              </h3>
              <p className="text-foreground">
                If California privacy laws apply, you may have specific rights
                regarding access and deletion. We do not sell personal
                information.
              </p>
            </section>

            {/* 10. Children's privacy */}
            <section id="childrens-privacy" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                10. Children's privacy
              </h2>
              <p className="text-foreground">
                AtithiFlow is intended for business users. We do not knowingly
                collect personal information from children. If you believe a
                child has provided us personal information, contact us to
                request deletion.
              </p>
            </section>

            {/* 11. Third-party links */}
            <section id="third-party-links" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                11. Third-party links
              </h2>
              <p className="text-foreground">
                Our Site may include links to third-party websites (including
                social platforms). We are not responsible for their privacy
                practices. Please review their policies.
              </p>
            </section>

            {/* 12. Changes to this policy */}
            <section id="changes" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                12. Changes to this policy
              </h2>
              <p className="text-foreground">
                We may update this Privacy Policy from time to time. We will
                post the updated version on this page and update the "Last
                updated" date.
              </p>
            </section>

            {/* 13. Contact */}
            <section id="contact" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                13. Contact
              </h2>
              <p className="text-foreground mb-2">
                <strong>AtithiFlow (by Systechnosoft)</strong>
              </p>
              <p className="text-foreground">
                Email:{" "}
                <a
                  href="mailto:support@atithiflow.com"
                  className={animatedLinkClass}
                >
                  support@atithiflow.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
