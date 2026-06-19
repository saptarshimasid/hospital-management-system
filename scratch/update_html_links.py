import os
import re

workspace_dir = "/Users/saptarshimasid/Desktop/health"

replacements = {
    "Doctor": "doctor.html",
    "Patients": "patients.html",
    "Staff": "staff.html"
}

# Also ensure other links are correct just in case (e.g. ot, pharmacy, billing, revenue, reports, appointments, bed availability, dashboard)
all_replacements = {
    "Dashboard": "admin_dashboard.html",
    "Appointments": "appointments.html",
    "Bed Availability": "bed_availability.html",
    "OT": "ot.html",
    "Doctor": "doctor.html",
    "Patients": "patients.html",
    "Staff": "staff.html",
    "Pharmacy": "pharmacy.html",
    "Billing": "billing.html",
    "Revenue": "revenue.html",
    "Reports": "reports.html"
}

for filename in os.listdir(workspace_dir):
    if filename.endswith(".html") and filename != "index.html" and filename != "login_selection.html":
        filepath = os.path.join(workspace_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        original_content = content
        
        # We want to replace href="..." with the correct page for each sidebar navigation item.
        # A sidebar link usually looks like:
        # <a class="..." href="#">
        #   <span class="material-symbols-outlined">...</span>
        #   <span class="font-label-md text-label-md">Link Name</span>
        # </a>
        # Let's match:
        # - an opening <a> tag with any attributes, containing href="..." (can be #, or old links)
        # - optional whitespace/comments
        # - a <span> tag with material icon
        # - optional whitespace/comments
        # - a <span> tag containing the link name
        # - closing </a> tag
        
        for name, target_file in all_replacements.items():
            # If we are currently in that page, we should preserve its href but maybe it's already target_file.
            # Let's use a regex that matches:
            # Group 1: everything before href="
            # Group 2: href value (to be replaced)
            # Group 3: everything after href value up to the span containing the link name
            # Let's write a pattern:
            # (<a\b[^>]*href=["'])([^"']*)(["'][^>]*>(?:\s*<!--.*?-->)?\s*<span[^>]*>[^<]*</span>\s*<span[^>]*>)\s*NAME\s*(</span>\s*</a>)
            
            pattern = re.compile(
                r'(<a\b[^>]*href=["\'])([^"\']*)(["\'][^>]*>(?:\s*<!--.*?-->)?\s*<span[^>]*>[^<]*</span>\s*<span[^>]*>)\s*' + re.escape(name) + r'\s*(</span>\s*</a>)',
                re.IGNORECASE | re.DOTALL
            )
            
            content = pattern.sub(rf'\g<1>{target_file}\g<3>{name}\g<4>', content)

        if content != original_content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated links in {filename}")
        else:
            print(f"No link updates needed in {filename}")

print("Successfully finished updating HTML sidebar links.")
