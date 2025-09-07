import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";

export default function About() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center space-y-2 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-2 shadow">
                <img src="/favicon.png" alt="YuvaUpdate Logo" className="w-16 h-16 object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">YuvaUpdate</h1>
              <span className="text-muted-foreground">Version 1.0.0</span>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Our Mission</h2>
              <p className="text-muted-foreground mb-2">
                YuvaUpdate is dedicated to keeping young minds informed about current affairs and important news that shapes our world. We believe that staying informed is the first step toward making a positive impact in society.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">What We Offer</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><span className="font-semibold">Curated News:</span> Hand-picked articles from reliable sources across various categories</li>
                <li><span className="font-semibold">Current Affairs:</span> Stay updated with the latest developments in politics, technology, sports, and more</li>
                <li><span className="font-semibold">Clean Interface:</span> Distraction-free reading experience with intuitive navigation</li>
                <li><span className="font-semibold">Personalization:</span> Save articles, filter by categories, and customize your news feed</li>
                <li><span className="font-semibold">Real-time Updates:</span> Get the latest news as it happens with push notifications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Key Features</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><span className="font-semibold">Cross-platform:</span> Available on both iOS and Android</li>
                <li><span className="font-semibold">Dark Mode:</span> Easy on the eyes with light and dark themes</li>
                <li><span className="font-semibold">Offline Reading:</span> Save articles to read even without internet</li>
                <li><span className="font-semibold">Smart Notifications:</span> Get notified about breaking news and updates</li>
                <li><span className="font-semibold">Category Filters:</span> Focus on topics that matter to you</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Our Values</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><span className="font-semibold">Accuracy:</span> We prioritize reliable and fact-checked information</li>
                <li><span className="font-semibold">Transparency:</span> Clear sourcing and attribution for all content</li>
                <li><span className="font-semibold">Privacy:</span> Your data is protected and never shared without consent</li>
                <li><span className="font-semibold">Accessibility:</span> News should be accessible to everyone, everywhere</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Technology</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>React Native for cross-platform compatibility</li>
                <li>Firebase for real-time data and authentication</li>
                <li>Optimized performance for smooth scrolling and quick loading</li>
                <li>Secure data transmission and storage</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">Contact Us – Yuva Update</h2>
              <p className="text-muted-foreground mb-2">If you have any questions, suggestions, or business inquiries, please feel free to reach out to us:</p>
              <ul className="text-muted-foreground">
                <li>Email: <a href="mailto:hr.jogenroy@gmail.com" className="underline">hr.jogenroy@gmail.com</a></li>
                <li>Phone: <a href="tel:+918011418040" className="underline">+918011418040</a></li>
                <li>Address: Tezpur, Assam, India</li>
              </ul>
              <p className="text-muted-foreground mt-2">We typically respond within 24 hours and value every piece of feedback from our users.</p>
            </section>

            <footer className="text-center text-xs text-muted-foreground mt-8">
              © 2025 YuvaUpdate. All rights reserved.<br />
              Thank you for choosing YuvaUpdate to stay informed about the world around you. Together, let's build a more informed and engaged community.
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}