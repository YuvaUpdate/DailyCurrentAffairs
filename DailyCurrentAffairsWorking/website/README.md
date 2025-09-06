# YuvaUpdate Policies Website

This folder contains a simple HTML website with all the required policies for Google Play Console submission.

## Files Included

- `index.html` - Complete website with Privacy Policy, Terms of Service, About, and Support pages

## Hosting Instructions

### Option 1: GitHub Pages (Free)
1. Create a new repository on GitHub
2. Upload the `index.html` file to the repository
3. Go to repository Settings > Pages
4. Select "Deploy from a branch" and choose "main"
5. Your website will be available at: `https://yourusername.github.io/repositoryname`

### Option 2: Netlify (Free)
1. Go to netlify.com
2. Drag and drop the entire `website` folder
3. Your site will be deployed with a random URL (you can customize it)

### Option 3: Firebase Hosting (Free)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `firebase init hosting`
4. Deploy with `firebase deploy`

## Google Play Console Setup

1. Deploy the website using any of the above options
2. In Google Play Console, go to your app's Store Listing
3. Add the website URL to the "Privacy Policy" field
4. The website contains all required policies accessible via navigation

## Required URLs for Google Play Console

- **Privacy Policy**: `your-website-url/#privacy`
- **Terms of Service**: `your-website-url/#terms`
- **Support/Contact**: `your-website-url/#support`

## Customization

You can customize the website by editing `index.html`:

- Update contact email from `support@yuvaupdate.com` to `hr.jogenroy@gmail.com`
- Modify app information and version numbers
- Change colors by updating the CSS variables
- Add your actual website domain if you have one

## Content Compliance

The policies include:

✅ Data collection and usage explanation  
✅ Third-party services (Firebase) disclosure  
✅ User rights and data deletion  
✅ Children's privacy protection (COPPA compliance)  
✅ Contact information for support  
✅ Terms of service with acceptable use policy  
✅ Limitation of liability clauses  
✅ Content attribution and intellectual property  

These policies meet Google Play Console requirements for app submission.
