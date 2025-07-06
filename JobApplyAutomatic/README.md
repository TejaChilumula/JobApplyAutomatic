# Auto Job Apply Builder

A Chrome extension that automatically fills and submits job application forms (ATS, Workday, Greenhouse, Lever, etc.) using your stored profile and GPT for unknown questions. Supports multi-tab automation and resume selection based on job description.

## Features
- User profile form (fill/edit details)
- Secure Chrome storage for user data
- Auto-fills and submits job application forms
- Resume selection based on job description/role
- Multi-tab support
- GPT-powered answers for unknown questions
- End-to-end automation (multi-page navigation, submission)

## Setup
1. Clone/download this repo.
2. Run `npm install` in the root directory.
3. Build the extension (if using a bundler) or use as-is for development.
4. Load the `JobApplyAutomatic` folder as an unpacked extension in Chrome.

## Usage
1. Click the extension icon to open the popup and fill in your profile.
2. Open a job application page, click the extension, and hit 'Run'.
3. The extension will auto-fill, navigate, and submit the application. If a question is unknown, GPT will generate an answer.

## Configuration
- Edit your profile anytime via the popup.
- Add multiple resumes in the options page for keyword-based selection.

---

**Note:** This is a proof-of-concept. Use responsibly and at your own risk. 