import Admin from "../models/Admin";

export const ensureAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log(
        "No ADMIN_EMAIL or ADMIN_PASSWORD set. Skipping admin bootstrap."
      );
      return;
    }
    console.log(`Bootstrapping Admin with Env Email: ${adminEmail}`);

    // Find existing admin by email or generic admin role
    let admin = await Admin.findOne({ email: adminEmail });

    if (!admin) {
      // If not found by specific email, check if ANY admin exists to update
      // This logic prevents creating multiple admins on env var change if we want a single admin
      // For now, let's look for specific email first. If we want to strictly single-instance:
      const anyAdmin = await Admin.findOne({ role: "admin" });
      if (anyAdmin) {
        admin = anyAdmin;
        console.log(
          `Found existing admin: ${admin.email}. Updating credentials...`
        );
      }
    }

    if (admin) {
      // Update existing
      let changed = false;
      if (admin.email !== adminEmail) {
        admin.email = adminEmail;
        changed = true;
      }
      // Compare password? Or just always overwrite? Overwriting is safer to ensure it matches env
      // But we can't easily compare hashed password with plain text without re-hashing
      // So we will just set it. Mongoose pre-save hook should handle hashing if modified.
      // However, we need to know if we should mark it modified.
      // If we blindly set it every time, we might trigger unnecessary saves.
      // But for startup script, unnecessary save is fine.
      admin.password = adminPassword; // Triggers pre-save hash

      await admin.save();
      if (changed) console.log("Admin email updated from env vars.");
      console.log("Admin password synced from env vars.");
    } else {
      // Create new
      admin = new Admin({
        name: "Admin User",
        email: adminEmail,
        password: adminPassword,
        phone: "+91 00000 00000",
        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
        role: "admin",
      });
      await admin.save();
      console.log("New Admin user created from env vars.");
    }
  } catch (error) {
    console.error("Error bootstrapping admin:", error);
    // Don't exit process, just log error so server can still start
  }
};
