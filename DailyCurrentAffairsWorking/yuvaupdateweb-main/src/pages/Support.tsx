import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { WebAnalyticsService } from "@/services/WebAnalyticsService";
import { useEffect } from "react";

export default function Support() {
  useEffect(() => {
    WebAnalyticsService.trackPageView('/support');
  }, []);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Support &amp; Help</h1>
            <p className="text-xs text-muted-foreground mb-8">We're here to help! Find answers to common questions or contact our support team below.</p>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Get Help</h2>
              <p className="text-muted-foreground">Need assistance with YuvaUpdate? We're here to help! Find answers to common questions below or contact our support team.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">How do I save articles to read later?</h4>
                  <p className="text-muted-foreground text-sm">Tap the heart icon on any article card to bookmark it. You can view all saved articles in the sidebar under "Saved".</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Can I customize my news categories?</h4>
                  <p className="text-muted-foreground text-sm">Yes! Use the sidebar to filter articles by categories like Politics, Technology, Sports, and more.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">How often is the news updated?</h4>
                  <p className="text-muted-foreground text-sm">Our news feed is updated continuously throughout the day. Pull down on the main screen to refresh and get the latest articles.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Why am I not receiving notifications?</h4>
                  <p className="text-muted-foreground text-sm">Make sure notifications are enabled in your device settings for YuvaUpdate. You can also check the app's notification preferences.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">How do I switch between light and dark mode?</h4>
                  <p className="text-muted-foreground text-sm">Tap the theme toggle button (sun/moon icon) in the top right corner of the main screen.</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Contact Us – Yuva Update</h2>
              <p className="text-muted-foreground mb-2">If you have any questions, suggestions, or business inquiries, please feel free to reach out to us:</p>
              <div className="flex flex-col md:flex-row gap-4 mb-2">
                <a href="mailto:hr.jogenroy@gmail.com" className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold text-center">Email Us</a>
                <a href="tel:+918011418040" className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold text-center">Call Us</a>
              </div>
              <ul className="text-muted-foreground mb-2">
                <li>Email: <a href="mailto:hr.jogenroy@gmail.com" className="underline">hr.jogenroy@gmail.com</a></li>
                <li>Phone: <a href="tel:+918011418040" className="underline">+918011418040</a></li>
                <li>Address: Tezpur, Assam, India</li>
                <li>Response time: Within 24 hours</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">App Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Version: 1.0.0</li>
                <li>Developer: YuvaUpdate Team</li>
                <li>Platform: iOS &amp; Android</li>
                <li>Last Updated: September 2025</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Feedback</h2>
              <p className="text-muted-foreground">Your feedback helps us improve YuvaUpdate. Share your suggestions, report bugs, or let us know what features you'd like to see next. We read every message and appreciate your input in making YuvaUpdate the best news app for current affairs.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Troubleshooting</h2>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">App is running slowly:</span>
                  <ul className="list-disc list-inside text-muted-foreground ml-4">
                    <li>Close and restart the app</li>
                    <li>Check your internet connection</li>
                    <li>Free up device storage space</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Articles not loading:</span>
                  <ul className="list-disc list-inside text-muted-foreground ml-4">
                    <li>Pull down to refresh the feed</li>
                    <li>Check your internet connection</li>
                    <li>Try switching between WiFi and mobile data</li>
                  </ul>
                </div>
                <div>
                  <span className="font-semibold">Login issues:</span>
                  <ul className="list-disc list-inside text-muted-foreground ml-4">
                    <li>Verify your email and password</li>
                    <li>Check for typing errors</li>
                    <li>Use the "Forgot Password" option if needed</li>
                  </ul>
                </div>
              </div>
            </section>

            <footer className="text-center text-xs text-muted-foreground mt-8">
              We typically respond to support requests within 24 hours.<br />
              &copy; 2025 YuvaUpdate. All rights reserved.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}