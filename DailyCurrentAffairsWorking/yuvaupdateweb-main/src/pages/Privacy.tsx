import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { WebAnalyticsService } from "@/services/WebAnalyticsService";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    WebAnalyticsService.trackPageView('/privacy');
  }, []);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
            <p className="text-xs text-muted-foreground mb-8">Last updated: September 6, 2025</p>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">1. Information We Collect</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><span className="font-semibold">Account Information:</span> When you create an account, we collect your email address and display name.</li>
                <li><span className="font-semibold">Usage Information:</span> We collect information about how you use our app, including articles you read and categories you prefer.</li>
                <li><span className="font-semibold">Device Information:</span> We collect device-specific information such as your device model, operating system version, and unique device identifiers.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">2. How We Use Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Personalize content based on your interests</li>
                <li>Send you relevant notifications about news updates</li>
                <li>Ensure the security and integrity of our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">3. Information Sharing</h2>
              <p className="text-muted-foreground mb-2">We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following cases:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To comply with legal obligations</li>
                <li>To protect and defend our rights and property</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">4. Data Security</h2>
              <p className="text-muted-foreground">We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes internal reviews of our data collection, storage, and processing practices.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">5. Third-Party Services</h2>
              <p className="text-muted-foreground">Our app uses Firebase for authentication and data storage. Firebase's privacy policy applies to their handling of your data. We also use external news sources for content, and their respective privacy policies apply when you visit their websites.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">6. Your Rights</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of notifications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">7. Children's Privacy</h2>
              <p className="text-muted-foreground">Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">8. Changes to This Policy</h2>
              <p className="text-muted-foreground">We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">9. Contact Us – Yuva Update</h2>
              <p className="text-muted-foreground mb-2">If you have any questions, suggestions, or business inquiries about this privacy policy, please feel free to reach out to us:</p>
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