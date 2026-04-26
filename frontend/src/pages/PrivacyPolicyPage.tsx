import { Shield, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function PrivacyPolicyPage() {
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
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-app-muted">Last updated: March 30, 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-app-text/90 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
              <p>
                Welcome to Student Society. We are committed to protecting your personal information and your right to privacy. 
                This Privacy Policy explains how we collect, use, and share information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>
              <p className="mb-2">We collect information that you provide directly to us when you create an account:</p>
              <ul className="list-disc pl-5 space-y-2 text-app-muted">
                <li><span className="text-app-text font-medium">Identity Data:</span> Full name, username.</li>
                <li><span className="text-app-text font-medium">Contact Data:</span> Email address.</li>
                <li><span className="text-app-text font-medium">User Content:</span> Posts, comments, messages, and profile information.</li>
                <li><span className="text-app-text font-medium">Technical Data:</span> Device information and usage logs for security purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
              <p>We use your information to provide, maintain, and improve our services, including:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>Securing your account and verifying your identity.</li>
                <li>Enabling you to participate in community discussions and messaging.</li>
                <li>Personalizing your experience on the platform.</li>
                <li>Communicating with you about updates or security notices.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">4. Security</h2>
              <p>
                We implement robust security measures to protect your data. Your password is encrypted and stored securely 
                via our authentication partner, Supabase. While we strive to use commercially acceptable means to protect 
                your personal info, we cannot guarantee its absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">5. Data Sharing</h2>
              <p>
                We do not sell, rent, or trade your personal information to third parties. We may share data with 
                service providers who perform work on our behalf or for legal compliance.
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
                    If you have any questions about this Privacy Policy, please contact us at{" "}
                    <a href="mailto:contact@studentsociety.in" className="text-brand font-semibold hover:underline">
                      contact@studentsociety.in意识
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
