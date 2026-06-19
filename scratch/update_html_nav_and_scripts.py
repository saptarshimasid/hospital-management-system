import os
import re

workspace_dir = "/Users/saptarshimasid/Desktop/health"

nav_items = [
    {"name": "Dashboard", "href": "admin_dashboard.html", "icon": "dashboard"},
    {"name": "Appointments", "href": "appointments.html", "icon": "calendar_today"},
    {"name": "Bed Availability", "href": "bed_availability.html", "icon": "bed"},
    {"name": "OT", "href": "ot.html", "icon": "surgical"},
    {"name": "Doctor", "href": "doctor.html", "icon": "person_filled"},
    {"name": "Patients", "href": "patients.html", "icon": "groups"},
    {"name": "Staff", "href": "staff.html", "icon": "medical_services"},
    {"name": "Pharmacy", "href": "pharmacy.html", "icon": "medication"},
    {"name": "Pantry", "href": "pantry.html", "icon": "restaurant"},
    {"name": "Billing", "href": "billing.html", "icon": "payments"},
    {"name": "Revenue", "href": "revenue.html", "icon": "trending_up"},
    {"name": "Reports", "href": "reports.html", "icon": "analytics"},
    {"name": "Settings", "href": "#", "icon": "settings"},
]

js_script = """
  <!-- Dynamic Date, Search & Notification Script -->
  <script>
    (function() {
      // 1. Dynamic date updates
      const today = new Date();
      const displayDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const inputDate = today.toISOString().split('T')[0];

      document.querySelectorAll('input[type="date"]').forEach(input => {
        input.value = inputDate;
      });

      document.querySelectorAll('.header-date-text').forEach(el => {
        el.textContent = displayDate;
      });

      // 2. Close dialog when clicking outside (backdrop click)
      document.querySelectorAll('dialog').forEach(dialog => {
        dialog.addEventListener('click', (e) => {
          const rect = dialog.getBoundingClientRect();
          const isInDialog = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (!isInDialog) {
            dialog.close();
          }
        });
      });

      // 3. Notification Dropdown Integration & Live Polling
      const notifBtn = Array.from(document.querySelectorAll('header button')).find(btn => {
        const span = btn.querySelector('.material-symbols-outlined');
        return span && span.textContent.trim() === 'notifications';
      });

      if (notifBtn) {
        // Create dropdown container if not exists
        let dropdown = notifBtn.querySelector('.notifications-dropdown-menu');
        if (!dropdown) {
          dropdown = document.createElement('div');
          dropdown.className = 'notifications-dropdown-menu absolute right-0 mt-3 w-80 glass-card bg-[#0b1326]/95 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 text-xs text-[#dae2fd] hidden';
          dropdown.style.top = '100%';
          dropdown.style.cursor = 'default';
          dropdown.style.textAlign = 'left';
          dropdown.style.userSelect = 'text';

          // Stop clicks inside dropdown from propagating
          dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          notifBtn.appendChild(dropdown);
        }

        let notifications = [];

        async function fetchNotifications() {
          try {
            const res = await fetch("http://localhost:5001/api/notifications");
            if (res.ok) {
              notifications = await res.json();
              renderNotifications();
            }
          } catch (err) {
            console.error("Failed to fetch notifications", err);
          }
        }

        async function markAllAsRead() {
          try {
            const res = await fetch("http://localhost:5001/api/notifications/read-all", {
              method: "PUT"
            });
            if (res.ok) {
              fetchNotifications();
            }
          } catch (err) {
            console.error(err);
          }
        }

        async function markAsRead(id) {
          try {
            const res = await fetch(`http://localhost:5001/api/notifications/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ read: true })
            });
            if (res.ok) {
              fetchNotifications();
            }
          } catch (err) {
            console.error(err);
          }
        }

        function renderNotifications() {
          const unreadCount = notifications.filter(n => !n.read).length;
          const badge = notifBtn.querySelector('.bg-error') || notifBtn.querySelector('span[class*="bg-error"]');
          if (badge) {
            if (unreadCount > 0) {
              badge.style.display = 'flex';
              badge.className = 'absolute bg-error text-white font-extrabold text-[8px] flex items-center justify-center rounded-full animate-pulse border border-[#0b1326]';
              badge.style.width = '16px';
              badge.style.height = '16px';
              badge.style.top = '2px';
              badge.style.right = '2px';
              badge.textContent = unreadCount;
            } else {
              badge.style.display = 'none';
            }
          }

          let html = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-white/5 font-bold" style="user-select: none;">
              <span class="text-primary font-bold">Clinical Alerts</span>
              \${unreadCount > 0 ? `<button class="mark-all-read text-[10px] text-primary-container hover:underline cursor-pointer font-medium" style="background:none; border:none; padding:0;">Mark all read</button>` : ''}
            </div>
            <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar select-text">
          `;

          if (notifications.length === 0) {
            html += `<div class="text-center py-6 text-on-surface-variant opacity-60">No new alerts</div>`;
          } else {
            notifications.forEach(n => {
              const id = n._id || n.id;
              html += `
                <div class="p-2.5 rounded-xl border transition-all cursor-pointer notif-item \${
                  n.read 
                    ? "bg-white/5 border-white/5 opacity-60" 
                    : "bg-primary-container/5 border-primary-container/20 hover:bg-primary-container/10"
                }" data-id="\${id}" style="margin-bottom: 8px;">
                  <div class="flex justify-between items-start gap-2">
                    <p class="font-medium \${n.read ? "text-on-surface-variant" : "text-primary"}" style="margin: 0; line-height: 1.3;">
                      \${n.text}
                    </p>
                    <span class="text-[8px] text-on-surface-variant font-mono shrink-0" style="white-space: nowrap;">\${n.time}</span>
                  </div>
                  <div class="mt-1 flex items-center justify-between">
                    <span class="text-[8px] uppercase tracking-wider font-bold \${
                      n.type === 'urgent' ? 'text-error' : n.type === 'success' ? 'text-tertiary-container' : 'text-primary-container'
                    }">
                      \${n.type}
                    </span>
                    \${!n.read ? `<span class="w-1.5 h-1.5 bg-[#00f0ff] rounded-full"></span>` : ''}
                  </div>
                </div>
              `;
            });
          }

          html += `</div>`;
          dropdown.innerHTML = html;

          // Event Listeners for inside dropdown
          const markAllBtn = dropdown.querySelector('.mark-all-read');
          if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              markAllAsRead();
            });
          }

          dropdown.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              const id = item.getAttribute('data-id');
              markAsRead(id);
            });
          });
        }

        fetchNotifications();
        setInterval(fetchNotifications, 4000);

        notifBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
          dropdown.classList.add('hidden');
        });
      }

      // 4. Live Search Synchronizer & Filter
      const globalSearchInput = document.querySelector('header input[placeholder*="Search"]');
      if (globalSearchInput) {
        const pageSearchInputs = [
          'pharmacySearchInput',
          'otSearchInput',
          'bedSearchInput',
          'reportsSearchInput',
          'appointmentSearch',
          'billingSearchInput',
          'revenueSearchInput',
          'doctorSearchInput',
          'patientsSearchInput',
          'staffSearchInput',
          'pantrySearchInput'
        ];

        const triggerSearch = (query) => {
          query = query.toLowerCase().trim();

          // Sync other page search inputs
          pageSearchInputs.forEach(id => {
            const inp = document.getElementById(id);
            if (inp && inp !== globalSearchInput && inp.value !== query) {
              inp.value = query;
              inp.dispatchEvent(new Event('input'));
            }
          });

          // Filter tables
          document.querySelectorAll('main table').forEach(table => {
            table.querySelectorAll('tbody tr').forEach(row => {
              if (row.querySelector('th')) return;
              const text = row.innerText.toLowerCase();
              row.style.display = text.includes(query) ? '' : 'none';
            });
          });

          // Fallback bed availability grid filtering
          if (window.location.pathname.includes('bed_availability.html')) {
            document.querySelectorAll('.grid > .glass-card').forEach(card => {
              const text = card.innerText.toLowerCase();
              if (card.querySelector('h3') && (card.innerText.includes('GW-') || card.innerText.includes('ICU-') || card.innerText.includes('ER-') || card.innerText.includes('PED-'))) {
                card.style.display = text.includes(query) ? '' : 'none';
              }
            });
          }
        };

        globalSearchInput.addEventListener('input', (e) => {
          triggerSearch(e.target.value);
        });

        pageSearchInputs.forEach(id => {
          const inp = document.getElementById(id);
          if (inp) {
            inp.addEventListener('input', (e) => {
              if (globalSearchInput.value !== e.target.value) {
                globalSearchInput.value = e.target.value;
              }
            });
          }
        });
      }
    })();
  </script>
"""

def generate_nav(active_filename):
    lines = []
    for item in nav_items:
        is_active = (item["href"] == active_filename)
        # Settings is never marked active on other files, andSettings doesn't have its own file
        if is_active:
            lines.append(f"""      <!-- {item['name']} (Active) -->
      <a class="flex items-center gap-3 px-6 py-4 text-tertiary-container border-l-4 border-tertiary-container bg-tertiary-container/10 transition-all duration-150 active:scale-[0.98]" href="{item['href']}">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">{item['icon']}</span>
        <span class="font-label-md text-label-md">{item['name']}</span>
      </a>""")
        else:
            lines.append(f"""      <!-- {item['name']} -->
      <a class="flex items-center gap-3 px-6 py-4 text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors" href="{item['href']}">
        <span class="material-symbols-outlined">{item['icon']}</span>
        <span class="font-label-md text-label-md">{item['name']}</span>
      </a>""")
    return "\n".join(lines)

for filename in os.listdir(workspace_dir):
    if filename.endswith(".html") and filename not in ["index.html", "login_selection.html"]:
        filepath = os.path.join(workspace_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # 1. Update navigation sidebar
        # Match <nav class="flex-1 space-y-1"> ... </nav>
        nav_pattern = re.compile(r'(<nav class="flex-1 space-y-1">)(.*?)(</nav>)', re.DOTALL)
        new_nav_content = f"\n{generate_nav(filename)}\n    "
        content, count = nav_pattern.subn(rf'\g<1>{new_nav_content}\g<3>', content)
        if count > 0:
            print(f"Updated nav sidebar in {filename}")
        else:
            print(f"WARNING: Could not find nav element in {filename}")

        # 2. Clean up any existing injected or duplicate date/notification/centering scripts
        # Pattern 1: match old date/centering script
        old_pattern_1 = r"\s*<!-- Dynamic Date & Dialog Centering Script -->.*?<!-- Dynamic Date & Dialog Centering Script -->.*?</script>"
        content = re.sub(old_pattern_1, "", content, flags=re.DOTALL)
        
        # Pattern 2: match old search/notification script (with comment wrappers)
        old_pattern_2 = r"\s*<!-- Dynamic Date, Search & Notification Script -->.*?<!-- Dynamic Date, Search & Notification Script -->.*?</script>"
        content = re.sub(old_pattern_2, "", content, flags=re.DOTALL)

        # Pattern 3: match raw function wrappers with date/notification/search updates (e.g. without comment wrappers)
        old_pattern_3 = r"\s*<script>\s*\(function\(\)\s*\{\s*// 1\.\s*Dynamic date updates.*?<\/script>"
        content = re.sub(old_pattern_3, "", content, flags=re.DOTALL)

        # Remove extra text remnants
        if "Dynamic Date & Dialog Centering Script" in content:
            content = content.replace("<!-- Dynamic Date & Dialog Centering Script -->", "")
        if "Dynamic Date, Search & Notification Script" in content:
            content = content.replace("<!-- Dynamic Date, Search & Notification Script -->", "")

        # 3. Inject new script at the end of body
        content = content.replace("</body>", js_script + "\n</body>")

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Injected scripts and cleaned {filename}")

print("Automation script run complete.")
