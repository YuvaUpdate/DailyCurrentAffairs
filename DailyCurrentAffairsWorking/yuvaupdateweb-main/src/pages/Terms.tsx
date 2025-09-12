import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { WebAnalyticsService } from "@/services/WebAnalyticsService";
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    WebAnalyticsService.trackPageView('/terms');
  }, []);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
            <p className="text-xs text-muted-foreground mb-8">Last updated: September 6, 2025</p>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">By downloading, installing, or using the YuvaUpdate mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">2. Description of Service</h2>
              <p className="text-muted-foreground">YuvaUpdate is a news aggregation mobile application that provides current affairs and news content to users. We curate and present news from various sources to keep you informed about current events.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">3. User Accounts</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>You may create an account to access additional features</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for all activities that occur under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">4. Acceptable Use</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Use the service for any unlawful purpose or in violation of these terms</li>
                <li>Attempt to gain unauthorized access to our systems or networks</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Use automated systems to access the service without permission</li>
                <li>Violate any applicable local, state, national, or international law</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">5. Content and Intellectual Property</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>News content is sourced from third-party providers and remains the property of the respective publishers</li>
                <li>The YuvaUpdate application design, features, and functionality are owned by us</li>
                <li>You may not reproduce, distribute, or create derivative works from our content without permission</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">6. Third-Party Content</h2>
              <p className="text-muted-foreground">Our service displays content from third-party news sources. We do not endorse or take responsibility for the accuracy, completeness, or reliability of third-party content. Users access external links at their own discretion.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">7. Privacy</h2>
              <p className="text-muted-foreground">Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">8. Disclaimers</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>The service is provided "as is" without warranties of any kind</li>
                <li>We do not guarantee the accuracy, completeness, or timeliness of news content</li>
                <li>We are not responsible for any decisions made based on information from our service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">10. Termination</h2>
              <p className="text-muted-foreground">We may terminate or suspend your access to the service at any time, with or without cause, and with or without notice. You may also terminate your account at any time.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">11. Changes to Terms</h2>
              <p className="text-muted-foreground">We reserve the right to modify these terms at any time. We will notify users of significant changes through the app or by email. Continued use of the service after changes constitutes acceptance of the new terms.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">12. Governing Law</h2>
              <p className="text-muted-foreground">These terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through appropriate legal channels.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">13. Contact Us – Yuva Update</h2>
              <p className="text-muted-foreground mb-2">If you have any questions, suggestions, or business inquiries about these Terms of Service, please feel free to reach out to us:</p>
              <ul className="text-muted-foreground">
                <li>Email: <a href="mailto:hr.jogenroy@gmail.com" className="underline">hr.jogenroy@gmail.com</a></li>
                <li>Phone: <a href="tel:+918011418040" className="underline">+918011418040</a></li>
                <li>Address: Tezpur, Assam, India</li>
              </ul>
              <p className="text-muted-foreground mt-2">We will respond to your inquiry within 24 hours.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}