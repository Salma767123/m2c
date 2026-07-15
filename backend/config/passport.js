const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { prisma } = require('./database');

// Configure Google OAuth Strategy — only when credentials are configured, so
// the backend can boot without them (they are optional in .env.example). Left
// unconditional, passport-google-oauth20 throws "requires a clientID" (F-14).
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const adminEmails = [process.env.ADMIN_EMAIL];
    const isAdmin = adminEmails.includes(email.toLowerCase());

    let user;
    let userType;

    if (isAdmin) {
      // Check if admin already exists
      user = await prisma.admin.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email: email }
          ]
        }
      });

      if (user) {
        // Existing admin found
        console.log(`👤 Passport: Existing admin found: ${email} (Provider: ${user.provider}, Verified: ${user.isVerified})`);

        // SECURITY CHECK: If admin registered with email/password but NOT verified
        if (user.provider === "local" && !user.isVerified) {
          console.log("⚠️ Passport: Admin registered but email not verified - blocking Google login");
          return done(new Error("Please verify your email first. Check your inbox for the verification link before signing in with Google."), null);
        }

        // Update existing admin with Google info
        // Preserve name and custom image if admin registered with local provider
        const updateData = {
          googleId: profile.id,
          provider: 'google',
          isVerified: true, // Safe to set true (already verified or Google user)
          lastLogin: new Date()
        };
        
        // Only update name if admin was previously a Google user
        if (user.provider === 'google') {
          updateData.name = profile.displayName;
        }
        
        // Only update image if no custom image exists
        const isGoogleImage = user.image && (
          user.image.includes('googleusercontent.com') || 
          user.image.includes('google.com') ||
          user.image.includes('lh3.googleusercontent.com')
        );
        
        if (!user.image || isGoogleImage || user.provider === 'google') {
          updateData.image = profile.photos[0]?.value;
        }
        
        user = await prisma.admin.update({
          where: { id: user.id },
          data: updateData
        });
        console.log("✅ Passport: Existing admin updated with Google credentials (name preserved)");
      } else {
        // Create new admin (auto-register)
        console.log("🆕 Passport: Auto-registering new Google admin:", email);
        user = await prisma.admin.create({
          data: {
            email: email,
            googleId: profile.id,
            name: profile.displayName,
            image: profile.photos[0]?.value,
            provider: 'google',
            isVerified: true, // New Google admins are auto-verified
            lastLogin: new Date()
          }
        });
        console.log("✅ Passport: Google admin auto-registered:", user.id);
      }
      userType = 'admin';
    } else {
      // Check if user already exists
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email: email }
          ]
        }
      });

      if (user) {
        // Existing user found
        console.log(`👤 Passport: Existing user found: ${email} (Provider: ${user.provider}, Verified: ${user.isVerified})`);

        // SECURITY CHECK: If user registered with email/password but NOT verified
        // Don't allow Google login to bypass email verification
        if (user.provider === "local" && !user.isVerified) {
          console.log("⚠️ Passport: User registered but email not verified - blocking Google login");
          return done(new Error("Please verify your email first. Check your inbox for the verification link before signing in with Google."), null);
        }

        // Update existing user with Google info (user is already verified or was Google user)
        // Preserve name and custom image if user registered with local provider
        const updateData = {
          googleId: profile.id,
          provider: 'google',
          isVerified: true, // Safe to set true (already verified or Google user)
          lastLogin: new Date()
        };
        
        // Only update name if user was previously a Google user
        if (user.provider === 'google') {
          updateData.name = profile.displayName;
        }
        
        // Only update image if no custom image exists
        const isGoogleImage = user.image && (
          user.image.includes('googleusercontent.com') || 
          user.image.includes('google.com') ||
          user.image.includes('lh3.googleusercontent.com')
        );
        
        if (!user.image || isGoogleImage || user.provider === 'google') {
          updateData.image = profile.photos[0]?.value;
        }
        
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
        console.log("✅ Passport: Existing user updated with Google credentials (name preserved)");
      } else {
        // Create new user (auto-register)
        console.log("🆕 Passport: Auto-registering new Google user:", email);
        user = await prisma.user.create({
          data: {
            email: email,
            googleId: profile.id,
            name: profile.displayName,
            image: profile.photos[0]?.value,
            provider: 'google',
            isVerified: true, // New Google users are auto-verified
            lastLogin: new Date()
          }
        });
        console.log("✅ Passport: Google user auto-registered:", user.id);

        // Note: Notification system not implemented yet
        console.log(`📝 New Google user registered: ${user.name} (${user.email})`);
      }
      userType = 'user';
    }

    // Add role to user object for session
    user.role = userType;
    return done(null, user);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));
} else {
  console.warn('⚠️  Google OAuth disabled — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    // Try to find user in users collection first
    let user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        isVerified: true,
        isActive: true
      }
    });
    let userType = 'user';

    // If not found in users, try admins collection
    if (!user) {
      user = await prisma.admin.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          isVerified: true,
          isActive: true
        }
      });
      userType = 'admin';
    }

    if (user) {
      user.role = userType;
    }

    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;