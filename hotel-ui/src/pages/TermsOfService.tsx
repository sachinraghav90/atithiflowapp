import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const animatedLinkClass =
  "relative inline-block text-primary hover:text-primary/80 focus-visible:text-primary/80 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100";

const tocItems = [
  { id: "definitions", label: "Definitions" },
  { id: "eligibility", label: "Eligibility and account responsibility" },
  { id: "use-of-site", label: "Use of the Site" },
  { id: "use-of-services", label: "Use of the Services (SaaS)" },
  { id: "customer-content", label: "Customer content and data" },
  { id: "third-party-services", label: "Third-party services" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "feedback", label: "Feedback" },
  { id: "fees-payment", label: "Fees and payment" },
  { id: "confidentiality", label: "Confidentiality" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "limitation-liability", label: "Limitation of liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "suspension-termination", label: "Suspension and termination" },
  { id: "changes-site-services", label: "Changes to the Site or Services" },
  { id: "changes-terms", label: "Changes to these Terms" },
  { id: "governing-law", label: "Governing law and dispute resolution" },
  { id: "notices-contact", label: "Notices and contact" },
  { id: "miscellaneous", label: "Miscellaneous" },
];

const TermsOfService = () => {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    
    document.title = "Terms of Service | AtithiFlow";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Read the terms that govern access to and use of AtithiFlow's website and services."
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
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              These terms govern your access to and use of AtithiFlow's website and services.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: 12 December 2025
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl">
          {/* Introduction */}
          <p className="text-foreground mb-4">
            These Terms of Service ("<strong>Terms</strong>") govern your access to and use of AtithiFlow's website and services. By accessing or using the AtithiFlow website (the "<strong>Site</strong>") or any AtithiFlow service offering (the "<strong>Services</strong>"), you agree to these Terms.
          </p>
          <p className="text-foreground mb-8">
            AtithiFlow is a hospitality operations SaaS product provided by <strong>Systechnosoft</strong> ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>").
          </p>
          <p className="text-foreground mb-8">
            If you do not agree to these Terms, do not use the Site or Services.
          </p>

          {/* Quick Summary Card */}
          <div className="bg-muted border border-border rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Quick summary
            </h2>
            <ul className="space-y-2 text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>These Terms apply to your use of the AtithiFlow Site and Services.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>You must use the Site and Services lawfully and not attempt to harm, disrupt, or misuse them.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>We own our intellectual property; you receive limited rights to use the Services as agreed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>The Site/Services are provided "as is" to the extent permitted by law.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Liability is limited as described below.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>We may suspend or terminate access for violations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>
                  If you have questions, contact{" "}
                  <a href="mailto:support@atithiflow.com" className={animatedLinkClass}>
                    support@atithiflow.com
                  </a>.
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
            {/* 1. Definitions */}
            <section id="definitions" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                1. Definitions
              </h2>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>"Customer"</strong> means the entity that signs an order form, subscription agreement, or otherwise purchases the Services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>"User"</strong> means anyone authorized by a Customer to use the Services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>"Site"</strong> means AtithiFlow's marketing website and related pages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>"Services"</strong> means AtithiFlow's software, features, and support made available to Customers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>"Content"</strong> means text, data, and materials submitted to or generated within the Services.</span>
                </li>
              </ul>
            </section>

            {/* 2. Eligibility and account responsibility */}
            <section id="eligibility" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                2. Eligibility and account responsibility
              </h2>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>You must be legally able to enter into a binding contract to use the Services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>If you create an account (now or later), you are responsible for:</span>
                </li>
              </ul>
              <ul className="space-y-2 text-foreground ml-10 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">–</span>
                  <span>maintaining the confidentiality of credentials,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">–</span>
                  <span>all activities under your account,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">–</span>
                  <span>ensuring Users comply with these Terms.</span>
                </li>
              </ul>
            </section>

            {/* 3. Use of the Site */}
            <section id="use-of-site" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                3. Use of the Site
              </h2>
              <p className="text-foreground mb-4">
                You may use the Site to learn about AtithiFlow, request information, and contact us.
              </p>
              <p className="text-foreground mb-3">You agree not to:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>attempt to gain unauthorized access to the Site or related systems,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>disrupt or interfere with the Site's security or performance,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>use the Site to transmit malware or harmful code,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>scrape, crawl, or harvest information at an unreasonable rate,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>misrepresent your identity or affiliation.</span>
                </li>
              </ul>
            </section>

            {/* 4. Use of the Services (SaaS) */}
            <section id="use-of-services" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                4. Use of the Services (SaaS)
              </h2>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                a) Subscription and order terms
              </h3>
              <p className="text-foreground mb-4">
                Access to the Services may be provided under an order form, subscription plan, statement of work, or other agreement (collectively, "<strong>Order Terms</strong>"). If Order Terms conflict with these Terms, the Order Terms control for the Services.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                b) License to use
              </h3>
              <p className="text-foreground mb-4">
                Subject to these Terms and any Order Terms, we grant the Customer a limited, non-exclusive, non-transferable right to access and use the Services during the subscription term.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                c) Acceptable use
              </h3>
              <p className="text-foreground mb-3">You must not:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>use the Services to violate any law or third-party rights,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>attempt to reverse engineer, decompile, or create derivative works of the Services (to the extent prohibited by law),</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>interfere with or disrupt the integrity or performance of the Services,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>bypass usage limits or access restrictions.</span>
                </li>
              </ul>
            </section>

            {/* 5. Customer content and data */}
            <section id="customer-content" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                5. Customer content and data
              </h2>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                a) Your content
              </h3>
              <p className="text-foreground mb-4">
                You (or the Customer) retain ownership of content you submit to the Services.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                b) Our use of content
              </h3>
              <p className="text-foreground mb-4">
                You grant us a limited right to process and display your content solely to provide and improve the Services, support Customers, prevent fraud, and comply with law.
              </p>

              <h3 className="text-lg font-medium text-foreground mb-3 mt-6">
                c) Data privacy
              </h3>
              <p className="text-foreground">
                Our collection and use of personal information is described in our{" "}
                <Link to="/privacy-policy" className={animatedLinkClass}>
                  Privacy Policy
                </Link>
                . Where applicable, a separate data processing agreement (DPA) may apply.
              </p>
            </section>

            {/* 6. Third-party services */}
            <section id="third-party-services" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                6. Third-party services (including scheduling)
              </h2>
              <p className="text-foreground mb-4">
                Our Site and Services may integrate with or link to third-party services (e.g., Calendly for meeting scheduling).
              </p>
              <p className="text-foreground">
                Third-party services are governed by their own terms and policies. We are not responsible for third-party services.
              </p>
            </section>

            {/* 7. Intellectual property */}
            <section id="intellectual-property" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                7. Intellectual property
              </h2>
              <p className="text-foreground mb-4">
                We and our licensors own all rights, title, and interest in and to the Site, Services, and related technology, including all intellectual property.
              </p>
              <p className="text-foreground">
                You may not use our trademarks, logos, or branding without written permission, except as allowed by law.
              </p>
            </section>

            {/* 8. Feedback */}
            <section id="feedback" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                8. Feedback
              </h2>
              <p className="text-foreground">
                If you provide feedback or suggestions, you grant us the right to use them without restriction or obligation, to the extent permitted by law.
              </p>
            </section>

            {/* 9. Fees and payment */}
            <section id="fees-payment" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                9. Fees and payment (if applicable)
              </h2>
              <p className="text-foreground mb-4">
                If you purchase Services, fees and payment terms will be set out in the Order Terms.
              </p>
              <p className="text-foreground mb-3">Unless stated otherwise:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>fees are non-refundable,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>taxes may apply,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>late payments may result in suspension.</span>
                </li>
              </ul>
            </section>

            {/* 10. Confidentiality */}
            <section id="confidentiality" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                10. Confidentiality
              </h2>
              <p className="text-foreground mb-4">
                If you receive non-public information from us, you agree to keep it confidential and use it only for evaluating or using the Services.
              </p>
              <p className="text-foreground">
                Mutual confidentiality terms may be included in Order Terms or a separate NDA.
              </p>
            </section>

            {/* 11. Disclaimers */}
            <section id="disclaimers" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                11. Disclaimers
              </h2>
              <p className="text-foreground mb-3">To the maximum extent permitted by law:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>The Site and Services are provided <strong>"as is"</strong> and <strong>"as available."</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>We disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>We do not guarantee the Site/Services will be uninterrupted or error-free.</span>
                </li>
              </ul>
            </section>

            {/* 12. Limitation of liability */}
            <section id="limitation-liability" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                12. Limitation of liability
              </h2>
              <p className="text-foreground mb-3">To the maximum extent permitted by law:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>We will not be liable for indirect, incidental, special, consequential, or punitive damages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Our total liability for claims related to the Site or Services is limited to the amount paid by the Customer to us in the 12 months preceding the event giving rise to the claim (or a different cap if set in Order Terms).</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                Some jurisdictions do not allow certain limitations, so these may not apply to you.
              </p>
            </section>

            {/* 13. Indemnification */}
            <section id="indemnification" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                13. Indemnification
              </h2>
              <p className="text-foreground mb-3">
                You agree to indemnify and hold us harmless from claims arising out of:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>your misuse of the Site or Services,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>your violation of these Terms,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>your content infringing third-party rights.</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                If you are a Customer under Order Terms, indemnities may be refined in your commercial agreement.
              </p>
            </section>

            {/* 14. Suspension and termination */}
            <section id="suspension-termination" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                14. Suspension and termination
              </h2>
              <p className="text-foreground mb-3">
                We may suspend or terminate your access to the Site/Services if:
              </p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>you violate these Terms,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>your use poses a security risk,</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>we are required to do so by law.</span>
                </li>
              </ul>
              <p className="text-foreground mt-4">
                Upon termination, your right to use the Site/Services ends.
              </p>
            </section>

            {/* 15. Changes to the Site or Services */}
            <section id="changes-site-services" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                15. Changes to the Site or Services
              </h2>
              <p className="text-foreground">
                We may update the Site and Services over time, including adding, removing, or modifying features. Where required by law, we will provide notice.
              </p>
            </section>

            {/* 16. Changes to these Terms */}
            <section id="changes-terms" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                16. Changes to these Terms
              </h2>
              <p className="text-foreground">
                We may update these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Continued use of the Site/Services after the change becomes effective constitutes acceptance.
              </p>
            </section>

            {/* 17. Governing law and dispute resolution */}
            <section id="governing-law" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                17. Governing law and dispute resolution
              </h2>
              <p className="text-foreground">
                These Terms are governed by the laws of India, without regard to conflict of laws principles. Any dispute arising out of or relating to these Terms, the Site, or the Services will be subject to the exclusive jurisdiction of the competent courts in Jaipur, Rajasthan, India.
              </p>
            </section>

            {/* 18. Notices and contact */}
            <section id="notices-contact" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                18. Notices and contact
              </h2>
              <p className="text-foreground mb-3">Questions about these Terms:</p>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Email:{" "}
                    <a href="mailto:support@atithiflow.com" className={animatedLinkClass}>
                      support@atithiflow.com
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>
                    Phone:{" "}
                    <a href="tel:+918562882887" className={animatedLinkClass}>
                      +91 (856) 288-2887
                    </a>
                  </span>
                </li>
              </ul>
            </section>

            {/* 19. Miscellaneous */}
            <section id="miscellaneous" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
                19. Miscellaneous
              </h2>
              <ul className="space-y-2 text-foreground ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Severability:</strong> If any provision is invalid, the remaining provisions remain in effect.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Assignment:</strong> You may not assign these Terms without our consent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Entire agreement:</strong> These Terms plus any Order Terms constitute the entire agreement regarding the Site/Services.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Waiver:</strong> Failure to enforce a provision is not a waiver.</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
