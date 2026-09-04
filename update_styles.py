import os

btn_styles = '''
/* GUEST LAUNCH BUTTON */
.guest-launch-wrapper {
  margin-bottom: 1.5rem;
}
.btn-guest-start {
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  color: #ffffff;
  border: none;
  padding: 0.9rem 1.6rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.btn-guest-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 26px rgba(99, 102, 241, 0.6);
}
'''

base_dir = r"C:\Users\RAM KUMAR S\.gemini\antigravity\scratch\prs-tutor-rag"

for folder in [base_dir, os.path.join(base_dir, "frontend")]:
    css_path = os.path.join(folder, "styles.css")
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()
    if ".btn-guest-start" not in content:
        with open(css_path, "a", encoding="utf-8") as f:
            f.write(btn_styles)

print("Styles updated successfully!")
