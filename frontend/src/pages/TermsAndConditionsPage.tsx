import { FileText, Mail, ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-app text-app-text px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Authentication
        </Link>
        
        <div className="bg-app-card rounded-[32px] border border-app-border/70 p-6 sm:p-10 shadow-xl shadow-brand/5 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Terms and Conditions</h1>
              <p className="text-sm text-app-muted">Last updated: March 30, 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-app-text/90 leading-relaxed">
            <p>
              By accessing or using Student Society, you agree to be bound by these Terms and Conditions. 
              Our platform is designed for students to connect, learn, and collaborate in a safe environment.
            </p>

            <section>
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-brand" />
                1. Eligibility
              </h2>
              <p>
                Student Society is intended for students and academic professionals. You must be at least 13 years old 
                (or the minimum age required in your country) to create an account. You represent that all 
                registration information you submit is accurate and truthful.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">2. User Conduct</h2>
              <p className="mb-2">You agree NOT to use the platform for:</p>
              <ul className="list-disc pl-5 space-y-2 text-app-muted">
                <li>Harassing, bullying, or threatening other members.</li>
                <li>Posting illegal, harmful, or sexually explicit content.</li>
                <li>Impersonating any person or entity.</li>
                <li>Distributing spam, malware, or unauthorized commercial communications.</li>
                <li>Engaging in academic dishonesty or facilitating cheating.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">3. Content Ownership</h2>
              <p>
                You retain all rights to the content you post on Student Society. However, by posting, you grant us 
                a worldwide, non-exclusive, royalty-free license to display and distribute that content. 
                We reserve the right to remove any content that violates these Terms or our community guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">4. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without notice, 
                if we believe you have violated these Terms or for maintain the safety of the community.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">5. Disclaimer</h2>
              <p>
                Student Society is provided "as is" without any warranties. We are not responsible for any content 
                posted by users or for any damages resulting from your use of the platform.
              </p>
            </section>

            <section className="pt-6 border-t border-app-border/50">
              <div className="bg-brand/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-brand flex items-center justify-center text-white shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Contact Support</h3>
                  <p className="text-sm text-app-muted">
                    If you have any questions about these Terms and Conditions, please contact our support team at{" "}
                    <a href="mailto:contact@studentsociety.in" className="text-brand font-semibold hover:underline">
                      contact@studentsociety.in
                    </a>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
