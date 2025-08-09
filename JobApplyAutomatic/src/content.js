// Content script for auto job application
// This script will be injected into job application pages

// Check if already initialized to prevent duplicate injection
if (window.autoJobApplicatorInitialized) {
  console.log('Auto Job Apply content script already initialized, skipping...');
} else {
  window.autoJobApplicatorInitialized = true;

  class AutoJobApplicator {
    constructor() {
      this.profile = null;
      this.resumes = [];
      this.gptService = null;
      this.platform = 'general';
      this.isRunning = false;
      this.currentStep = 0;
      this.maxSteps = 10; // Prevent infinite loops
      this.demographicAnswers = {
        gender: 'Male',
        sex: 'Male',
        age: '25-34',
        race: 'Asian',
        ethnicity: 'Asian',
        veteran: 'Never served',
        disability: 'No',
        lgbtq: 'No',
        military: 'Never served',
        minority: 'No',
        pronoun: 'He/Him',
        citizenship: 'US Citizen',
        hispanic: 'No',
        origin: 'Not Hispanic or Latino',
        // Add more as needed
      };
      this.hardcodedAnswers = [
        { keywords: ['have you ever worked', 'previously employed', 'prior employment'], answer: 'No' },
        { keywords: ['legally eligible', 'authorized to work', 'work authorization'], answer: 'Yes' },
        { keywords: ['preferred location', 'office location'], answer: 'Flexible/Open to any location' },
        { keywords: ['family member', 'familial relationship', 'relative'], answer: 'No' },
        { keywords: ['competing', 'signed contract', 'non-compete', 'conflict of interest'], answer: 'No' },
        { keywords: ['outside business', 'investment', 'vendor', 'intellectual property'], answer: 'No' },
        { keywords: ['used robinhood'], answer: 'No' },
        { keywords: ['privacy policy'], answer: 'Yes' },
        // Add more as needed
      ];
    }

    async init() {
      try {
        // Load user profile and resumes from storage
        await this.loadUserData();
        
        // Initialize GPT service
        this.initGPTService();
        
        // Detect ATS platform
        this.platform = this.detectATSPlatform();
        
        console.log('Auto Job Applicator initialized for platform:', this.platform);
        
        // Test GPT connection on init
        if (this.gptService) {
          await this.testGPTConnection();
        }
        
        return true;
      } catch (error) {
        console.error('Failed to initialize Auto Job Applicator:', error);
        return false;
      }
    }

    async loadUserData() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['profile', 'resumes', 'gptApiKey'], (result) => {
          this.profile = result.profile || {};
          this.resumes = result.resumes || [];
          this.gptApiKey = result.gptApiKey;
          resolve();
        });
      });
    }

    initGPTService() {
      if (this.gptApiKey && window.GPTService) {
        this.gptService = new window.GPTService(this.gptApiKey);
      }
    }

    // Detect ATS platform
    detectATSPlatform() {
      const url = window.location.href.toLowerCase();
      const hostname = window.location.hostname.toLowerCase();
      
      if (hostname.includes('workday') || url.includes('workday')) return 'workday';
      if (hostname.includes('greenhouse') || url.includes('greenhouse')) return 'greenhouse';
      if (hostname.includes('lever') || url.includes('lever')) return 'lever';
      if (hostname.includes('bamboohr') || url.includes('bamboohr')) return 'bamboohr';
      if (hostname.includes('icims') || url.includes('icims')) return 'icims';
      if (hostname.includes('smartrecruiters') || url.includes('smartrecruiters')) return 'smartrecruiters';
      if (hostname.includes('jobvite') || url.includes('jobvite')) return 'jobvite';
      if (hostname.includes('bullhorn') || url.includes('bullhorn')) return 'bullhorn';
      if (hostname.includes('workable') || url.includes('workable')) return 'workable';
      if (hostname.includes('breezy') || url.includes('breezy')) return 'breezy';
      if (hostname.includes('recruitee') || url.includes('recruitee')) return 'recruitee';
      if (hostname.includes('personio') || url.includes('personio')) return 'personio';
      if (hostname.includes('bamboo') || url.includes('bamboo')) return 'bamboo';
      if (hostname.includes('fountain') || url.includes('fountain')) return 'fountain';
      if (hostname.includes('ashby') || url.includes('ashby')) return 'ashby';
      
      return 'general';
    }

    // Find form field with basic selectors
    findFormField(fieldType) {
      const fieldSelectors = {
        // Basic fields we can handle reliably
        firstName: [
          'input[name*="first" i]', 'input[name*="firstname" i]', 'input[name*="first_name" i]',
          'input[id*="first" i]', 'input[id*="firstname" i]', 'input[id*="first_name" i]',
          'input[placeholder*="first" i]', 'input[placeholder*="first name" i]',
          'input[name="firstName"]', 'input[name="first_name"]', 'input[name="firstname"]'
        ],
        lastName: [
          'input[name*="last" i]', 'input[name*="lastname" i]', 'input[name*="last_name" i]',
          'input[id*="last" i]', 'input[id*="lastname" i]', 'input[id*="last_name" i]',
          'input[placeholder*="last" i]', 'input[placeholder*="last name" i]',
          'input[name="lastName"]', 'input[name="last_name"]', 'input[name="lastname"]'
        ],
        fullName: [
          'input[name*="name" i]', 'input[name*="fullname" i]', 'input[name*="full_name" i]',
          'input[id*="name" i]', 'input[id*="fullname" i]', 'input[id*="full_name" i]',
          'input[placeholder*="name" i]', 'input[placeholder*="full name" i]',
          'input[name="name"]', 'input[name="fullName"]', 'input[name="full_name"]'
        ],
        email: [
          'input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]',
          'input[placeholder*="email" i]', 'input[name="email"]', 'input[name="e-mail"]'
        ],
        phone: [
          'input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', 'input[name*="cell" i]',
          'input[id*="phone" i]', 'input[id*="mobile" i]', 'input[id*="cell" i]',
          'input[placeholder*="phone" i]', 'input[placeholder*="mobile" i]', 'input[placeholder*="cell" i]',
          'input[name="phone"]', 'input[name="mobile"]', 'input[name="cell"]', 'input[name="telephone"]'
        ],
        address: [
          'input[name*="address" i]', 'textarea[name*="address" i]', 'input[id*="address" i]',
          'textarea[id*="address" i]', 'input[placeholder*="address" i]',
          'textarea[placeholder*="address" i]', 'input[name="address"]', 'input[name="street"]'
        ],
        city: [
          'input[name*="city" i]', 'input[id*="city" i]', 'input[placeholder*="city" i]',
          'input[name="city"]', 'input[name="town"]'
        ],
        state: [
          'input[name*="state" i]', 'select[name*="state" i]', 'input[id*="state" i]',
          'select[id*="state" i]', 'input[placeholder*="state" i]',
          'input[name="state"]', 'input[name="province"]', 'input[name="region"]'
        ],
        zipCode: [
          'input[name*="zip" i]', 'input[name*="postal" i]', 'input[id*="zip" i]',
          'input[id*="postal" i]', 'input[placeholder*="zip" i]', 'input[placeholder*="postal" i]',
          'input[name="zip"]', 'input[name="zipcode"]', 'input[name="postal"]', 'input[name="postal_code"]'
        ],
        country: [
          'input[name*="country" i]', 'select[name*="country" i]', 'input[id*="country" i]',
          'select[id*="country" i]', 'input[placeholder*="country" i]',
          'input[name="country"]', 'input[name="nation"]'
        ],
        linkedin: [
          'input[name*="linkedin" i]', 'input[name*="linked" i]', 'input[id*="linkedin" i]',
          'input[placeholder*="linkedin" i]', 'input[name="linkedin"]', 'input[name="linkedin_url"]'
        ],
        github: [
          'input[name*="github" i]', 'input[name*="git" i]', 'input[id*="github" i]',
          'input[placeholder*="github" i]', 'input[name="github"]', 'input[name="github_url"]'
        ],
        website: [
          'input[name*="website" i]', 'input[name*="url" i]', 'input[name*="portfolio" i]',
          'input[id*="website" i]', 'input[id*="url" i]', 'input[placeholder*="website" i]',
          'input[placeholder*="url" i]', 'input[name="website"]', 'input[name="url"]', 'input[name="portfolio"]'
        ],
        currentCompany: [
          'input[name*="company" i]', 'input[name*="employer" i]', 'input[id*="company" i]',
          'input[placeholder*="company" i]', 'input[placeholder*="current company" i]',
          'input[name="company"]', 'input[name="employer"]', 'input[name="current_company"]'
        ],
        currentTitle: [
          'input[name*="title" i]', 'input[name*="position" i]', 'input[name*="job" i]',
          'input[id*="title" i]', 'input[id*="position" i]', 'input[placeholder*="title" i]',
          'input[placeholder*="position" i]', 'input[name="title"]', 'input[name="position"]', 'input[name="job_title"]'
        ],
        experience: [
          'input[name*="experience" i]', 'select[name*="experience" i]', 'input[id*="experience" i]',
          'select[id*="experience" i]', 'input[placeholder*="experience" i]',
          'input[name="experience"]', 'input[name="years_experience"]'
        ],
        education: [
          'input[name*="education" i]', 'select[name*="education" i]', 'input[id*="education" i]',
          'select[id*="education" i]', 'input[placeholder*="education" i]',
          'input[name="education"]', 'input[name="degree"]'
        ],
        salary: [
          'input[name*="salary" i]', 'input[name*="compensation" i]', 'input[id*="salary" i]',
          'input[placeholder*="salary" i]', 'input[placeholder*="compensation" i]',
          'input[name="salary"]', 'input[name="compensation"]', 'input[name="expected_salary"]'
        ],
        availability: [
          'input[name*="availability" i]', 'select[name*="availability" i]', 'input[id*="availability" i]',
          'select[id*="availability" i]', 'input[placeholder*="availability" i]',
          'input[name="availability"]', 'input[name="start_date"]'
        ]
      };

      const selectors = fieldSelectors[fieldType] || [];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) { // Check if visible
          return element;
        }
      }
      
      return null;
    }

    // Fill a form field intelligently based on field type
    async fillField(element, value) {
      if (!element || !value) return false;
      
      try {
        const fieldType = this.getFieldType(element);
        console.log(`Filling field type: ${fieldType} with value: ${value}`);
        
        switch (fieldType) {
          case 'select':
            return this.fillSelectField(element, value);
          case 'radio':
            return this.fillRadioField(element, value);
          case 'checkbox':
            return this.fillCheckboxField(element, value);
          case 'textarea':
            return this.fillTextareaField(element, value);
          case 'input':
          default:
            return this.fillInputField(element, value);
        }
      } catch (error) {
        console.error('Error filling field:', error);
        return false;
      }
    }

    // Detect field type
    getFieldType(element) {
      const tagName = element.tagName.toLowerCase();
      const type = element.type ? element.type.toLowerCase() : '';
      
      if (tagName === 'select') return 'select';
      if (tagName === 'textarea') return 'textarea';
      if (type === 'radio') return 'radio';
      if (type === 'checkbox') return 'checkbox';
      if (tagName === 'input') return 'input';
      
      return 'input'; // Default fallback
    }

    // Fill select dropdown field
    fillSelectField(select, value) {
      const options = Array.from(select.options);
      const valueLower = value.toLowerCase();
      
      // Try exact match first
      let selectedOption = options.find(option => 
        option.value.toLowerCase() === valueLower ||
        option.text.toLowerCase() === valueLower
      );
      
      // Try partial match
      if (!selectedOption) {
        selectedOption = options.find(option => 
          option.value.toLowerCase().includes(valueLower) ||
          option.text.toLowerCase().includes(valueLower)
        );
      }
      
      // Try fuzzy matching for common fields
      if (!selectedOption) {
        selectedOption = this.findBestOptionMatch(select, value);
      }
      
      if (selectedOption) {
        select.value = selectedOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Selected option: ${selectedOption.text} (${selectedOption.value})`);
        return true;
      } else {
        console.warn(`❌ No matching option found for value: ${value}`);
        console.log('Available options:', options.map(opt => `${opt.text} (${opt.value})`));
        return false;
      }
    }

    // Find best option match using fuzzy logic
    findBestOptionMatch(select, value) {
      const options = Array.from(select.options);
      const valueLower = value.toLowerCase();
      
      // Common field mappings
      const fieldMappings = {
        'experience': {
          '0-1': ['0', '1', 'entry', 'junior', '0-1', 'less than 1'],
          '1-3': ['1-3', '1 to 3', 'junior', '1 year', '2 years', '3 years'],
          '3-5': ['3-5', '3 to 5', 'mid', 'senior', '3 years', '4 years', '5 years'],
          '5+': ['5+', '5+ years', 'senior', 'expert', 'advanced', '5 years', '6 years', '7 years', '8 years', '9 years', '10 years']
        },
        'education': {
          'high school': ['high school', 'secondary', 'hs', '12th grade'],
          'bachelor': ['bachelor', 'bachelors', 'bs', 'ba', 'undergraduate', 'college'],
          'master': ['master', 'masters', 'ms', 'ma', 'graduate', 'postgraduate'],
          'phd': ['phd', 'doctorate', 'doctoral', 'doctor']
        },
        'sponsorship': {
          'yes': ['yes', 'require', 'need', 'sponsorship', 'h1b', 'visa'],
          'no': ['no', 'not require', 'dont need', 'no sponsorship', 'authorized', 'citizen', 'permanent']
        },
        'visa': {
          'student': ['student', 'f1', 'opt', 'cpt'],
          'h1b': ['h1b', 'work visa', 'sponsored'],
          'green card': ['green card', 'permanent', 'resident'],
          'citizen': ['citizen', 'us citizen', 'american']
        }
      };
      
      // Get field name for context
      const fieldName = select.name ? select.name.toLowerCase() : '';
      const fieldId = select.id ? select.id.toLowerCase() : '';
      
      // Check if this is a known field type
      for (const [fieldType, mappings] of Object.entries(fieldMappings)) {
        if (fieldName.includes(fieldType) || fieldId.includes(fieldType)) {
          for (const [key, keywords] of Object.entries(mappings)) {
            if (keywords.some(keyword => valueLower.includes(keyword))) {
              // Find option that matches the key
              const match = options.find(option => 
                option.value.toLowerCase().includes(key) ||
                option.text.toLowerCase().includes(key)
              );
              if (match) return match;
            }
          }
        }
      }
      
      return null;
    }

    // Fill radio button field
    fillRadioField(radioGroup, value) {
      const radios = document.querySelectorAll(`input[name="${radioGroup.name}"][type="radio"]`);
      const valueLower = value.toLowerCase();
      
      for (const radio of radios) {
        const radioValue = radio.value.toLowerCase();
        const radioLabel = this.findFieldLabel(radio)?.toLowerCase() || '';
        
        if (radioValue === valueLower || radioLabel === valueLower ||
            radioValue.includes(valueLower) || radioLabel.includes(valueLower)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`✅ Selected radio: ${radio.value}`);
          return true;
        }
      }
      
      console.warn(`❌ No matching radio button found for value: ${value}`);
      return false;
    }

    // Fill checkbox field
    fillCheckboxField(checkbox, value) {
      const valueLower = value.toLowerCase();
      const checkboxValue = checkbox.value.toLowerCase();
      const checkboxLabel = this.findFieldLabel(checkbox)?.toLowerCase() || '';
      
      // Check if value indicates checkbox should be checked
      const shouldCheck = ['yes', 'true', '1', 'check', 'agree', 'accept'].includes(valueLower) ||
                         checkboxValue.includes(valueLower) ||
                         checkboxLabel.includes(valueLower);
      
      if (shouldCheck && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Checked checkbox: ${checkbox.value || checkboxLabel}`);
        return true;
      } else if (!shouldCheck && checkbox.checked) {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Unchecked checkbox: ${checkbox.value || checkboxLabel}`);
        return true;
      }
      
      return false;
    }

    // Fill textarea field
    fillTextareaField(textarea, value) {
      textarea.focus();
      textarea.value = value;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Filled textarea with: ${value.substring(0, 50)}...`);
      return true;
    }

    // Fill input field
    fillInputField(input, value) {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Filled input with: ${value}`);
      return true;
    }

    // Find file upload field
    findFileUploadField() {
      const selectors = [
        'input[type="file"]',
        'input[accept*="pdf"]',
        'input[accept*="doc"]',
        'input[name*="resume" i]',
        'input[name*="cv" i]',
        'input[id*="resume" i]',
        'input[id*="cv" i]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          return element;
        }
      }
      return null;
    }

    // Upload file
    uploadFile(fileInput, fileData) {
      if (!fileInput || !fileData) return false;
      
      try {
        // Create a File object from the base64 data
        const byteString = atob(fileData.split(',')[1]);
        const mimeString = fileData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const file = new File([ab], 'resume.pdf', { type: mimeString });
        
        // Create a DataTransfer object and set the file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Set the files property
        fileInput.files = dataTransfer.files;
        
        // Trigger change event
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      } catch (error) {
        console.error('Error uploading file:', error);
        return false;
      }
    }

    // Select best resume based on job description
    selectResume(jobDescription, resumes) {
      if (!resumes || resumes.length === 0) return null;
      
      const description = jobDescription.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;
      
      for (const resume of resumes) {
        let score = 0;
        
        // Check for keyword matches
        const keywords = ['software', 'engineer', 'developer', 'data', 'science', 'design', 'marketing', 'sales'];
        for (const keyword of keywords) {
          if (description.includes(keyword) || resume.name.toLowerCase().includes(keyword)) {
            score += 1;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = resume;
        }
      }
      
      return bestMatch || resumes[0]; // Return first resume if no match found
    }

    // Find submit button
    findSubmitButton() {
      const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Apply")',
        'button:contains("Send")',
        'a:contains("Submit")',
        'a:contains("Apply")',
        '[role="button"]:contains("Submit")',
        '[role="button"]:contains("Apply")'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          return element;
        }
      }
      return null;
    }

    // Wait for element to appear
    waitForElement(selector, timeout = 5000) {
      return new Promise((resolve) => {
        if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            resolve(document.querySelector(selector));
            observer.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }

    // Start the auto apply process
    async start() {
      if (this.isRunning) {
        console.log('Auto apply already running');
        return;
      }

      this.isRunning = true;
      console.log('Starting auto apply process...');

      try {
        await this.processCurrentPage();
      } catch (error) {
        console.error('Error in auto apply process:', error);
      } finally {
        this.isRunning = false;
      }
    }

    // Process the current page
    async processCurrentPage() {
      console.log('Processing current page...');
      
      // Wait for page to load
      await this.waitForPageLoad();
      
      // Fill basic form fields
      await this.fillBasicFields();
      
      // Handle complex questions with GPT
      await this.handleComplexQuestions();
      
      // Handle file uploads
      await this.handleFileUploads();
      
      // Try to submit or navigate to next page
      await this.trySubmitOrNavigate();
    }

    // Wait for page to load
    async waitForPageLoad() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    }

    // Fill basic fields that we can handle reliably
    async fillBasicFields() {
      console.log('Filling basic fields...');
      
      const basicFields = [
        'firstName', 'lastName', 'fullName', 'email', 'phone', 'address', 'city', 'state', 
        'zipCode', 'country', 'linkedin', 'github', 'website', 'currentCompany', 'currentTitle',
        'experience', 'education', 'salary', 'availability'
      ];
      
      let filledCount = 0;
      
      for (const fieldType of basicFields) {
        const profileValue = this.profile[fieldType];
        if (!profileValue) continue;
        
        const field = this.findFormField(fieldType);
        if (field) {
          this.fillField(field, profileValue);
          console.log(`✅ Filled ${fieldType}: ${profileValue}`);
          filledCount++;
        }
      }
      
      console.log(`Filled ${filledCount} basic fields`);
    }

    // Handle complex questions that need GPT
    async handleComplexQuestions() {
      console.log('Handling complex questions...');
      const requiredFields = this.findRequiredFields();
      for (const field of requiredFields) {
        const fieldType = this.getFieldType(field);
        const question = this.getFieldQuestion(field);
        if (!question) continue;
        let answer = null;
        let source = null;
        // For dropdowns/radios, always select from options
        if (fieldType === 'select' || fieldType === 'radio') {
          // Extract all options
          let options = [];
          if (fieldType === 'select') options = Array.from(field.options).map(opt => opt.text.trim());
          if (fieldType === 'radio') {
            const radios = document.querySelectorAll(`input[name="${field.name}"][type="radio"]`);
            options = Array.from(radios).map(radio => this.findFieldLabel(radio) || radio.value);
          }
          // Try hardcoded/demographic/profile answer ONLY if it matches an option
          let localAnswer = this.getHardcodedAnswer(question) || this.demographicAnswers[this.getDemographicKey(question)] || this.getProfileValueForField(field);
          let matched = this.fuzzyMatchOption(options, localAnswer);
          if (matched) {
            answer = matched;
            source = 'Hardcoded/Demographic/Profile';
          } else if (this.gptService) {
            // If no match, ask GPT to pick the best option
            const gptPrompt = `You are filling out a job application. Here is the question: "${question}".\nAvailable options: ${options.join(', ')}\nChoose the best option from the list. Only respond with the exact option text.`;
            console.log('[GPT DEBUG] Question:', question);
            console.log('[GPT DEBUG] Options:', options);
            console.log('[GPT DEBUG] Prompt:', gptPrompt);
            const gptAnswer = await this.gptService.generateAnswer(question, gptPrompt);
            console.log('[GPT DEBUG] Raw GPT Response:', gptAnswer);
            answer = this.fuzzyMatchOption(options, gptAnswer);
            console.log('[GPT DEBUG] Matched Option:', answer);
            source = 'GPT';
          }
          // Fill the field if a valid option is found
          if (answer) {
            if (fieldType === 'select') {
              await this.fillSelectField(field, answer);
            } else {
              await this.fillRadioField(field, answer);
            }
            console.log(`Field: ${question}\nAnswer: ${answer}\nSource: ${source}`);
          } else {
            console.warn(`❌ Could not match any option for: "${question}". Options: ${options.join(', ')}`);
          }
          continue;
        }
        // For checkboxes, use hardcoded/demographic/profile/GPT as before
        answer = this.getHardcodedAnswer(question) || this.demographicAnswers[this.getDemographicKey(question)] || this.getProfileValueForField(field);
        source = 'Hardcoded/Demographic/Profile';
        if (!answer && this.gptService) {
          const gptPrompt = `You are filling out a job application. Here is the question: "${question}".\nShould this box be checked? Answer only "Yes" or "No".`;
          answer = await this.gptService.generateAnswer(question, gptPrompt);
          source = 'GPT';
        }
        if (fieldType === 'checkbox') {
          await this.fillCheckboxField(field, answer);
          console.log(`Field: ${question}\nAnswer: ${answer}\nSource: ${source}`);
          continue;
        }
        // For text/textarea, use hardcoded/demographic/profile/GPT as before
        if (!answer && this.gptService) {
          const gptPrompt = this.createGPTPrompt(question, field);
          answer = await this.gptService.generateAnswer(question, gptPrompt);
          source = 'GPT';
        }
        if (fieldType === 'textarea') {
          await this.fillTextareaField(field, answer);
        } else {
          await this.fillInputField(field, answer);
        }
        console.log(`Field: ${question}\nAnswer: ${answer}\nSource: ${source}`);
      }
      // After all required fields, check if all are filled, then submit
      setTimeout(() => { this.submitIfAllRequiredFilled(); }, 500);
    }

    // Check if a field needs GPT assistance
    needsGPTAssistance(question, fieldType) {
      const questionLower = question.toLowerCase();
      
      // Skip basic fields that should be filled with profile data
      if (['name', 'email', 'phone', 'address', 'linkedin', 'github'].includes(fieldType)) {
        return false;
      }
      
      // Questions that typically need custom answers
      const gptKeywords = [
        'why', 'how', 'describe', 'explain', 'tell', 'what', 'when', 'where',
        'experience', 'skills', 'strengths', 'weaknesses', 'goals', 'challenges',
        'teamwork', 'leadership', 'learning', 'salary', 'expectations',
        'motivation', 'interest', 'passion', 'background', 'story'
      ];
      
      return gptKeywords.some(keyword => questionLower.includes(keyword));
    }

    // Get profile value for a specific field
    getProfileValueForField(field) {
      const fieldName = field.name ? field.name.toLowerCase() : '';
      const fieldId = field.id ? field.id.toLowerCase() : '';
      const question = this.getFieldQuestion(field).toLowerCase();
      
      // Map field identifiers to profile properties
      const fieldMappings = {
        'first': this.profile.firstName,
        'last': this.profile.lastName,
        'name': this.profile.fullName || `${this.profile.firstName} ${this.profile.lastName}`,
        'email': this.profile.email,
        'phone': this.profile.phone,
        'mobile': this.profile.phone,
        'address': this.profile.address,
        'city': this.profile.city,
        'state': this.profile.state,
        'zip': this.profile.zipCode,
        'postal': this.profile.zipCode,
        'country': this.profile.country,
        'linkedin': this.profile.linkedin,
        'github': this.profile.github,
        'website': this.profile.website,
        'company': this.profile.currentCompany,
        'employer': this.profile.currentCompany,
        'title': this.profile.currentTitle,
        'position': this.profile.currentTitle,
        'experience': this.profile.experience,
        'education': this.profile.education,
        'degree': this.profile.education,
        'salary': this.profile.salary,
        'availability': this.profile.availability
      };
      
      // Check field name and ID
      for (const [key, value] of Object.entries(fieldMappings)) {
        if (value && (fieldName.includes(key) || fieldId.includes(key))) {
          return value;
        }
      }
      
      // Check question text
      for (const [key, value] of Object.entries(fieldMappings)) {
        if (value && question.includes(key)) {
          return value;
        }
      }
      
      return null;
    }

    // Find required fields that are empty
    findRequiredFields() {
      const requiredFields = [];
      
      // Look for required indicators
      const selectors = [
        'input[required]',
        'select[required]',
        'textarea[required]',
        'input[aria-required="true"]',
        'select[aria-required="true"]',
        'textarea[aria-required="true"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (!element.value && element.offsetParent !== null) {
            requiredFields.push(element);
          }
        }
      }
      
      // Also look for fields with required indicators in labels
      const allInputs = document.querySelectorAll('input, select, textarea');
      for (const input of allInputs) {
        if (input.value || !input.offsetParent) continue;
        
        const label = this.findFieldLabel(input);
        if (label && (label.includes('*') || label.toLowerCase().includes('required'))) {
          requiredFields.push(input);
        }
      }
      
      return requiredFields;
    }

    // Get the question text for a field
    getFieldQuestion(field) {
      const label = this.findFieldLabel(field);
      const placeholder = field.placeholder;
      const name = field.name;
      
      return label || placeholder || name || 'Please provide information';
    }

    // Get answer from GPT for a question
    async getGPTAnswer(question, field) {
      if (!this.gptService) return null;
      
      // Create context-aware prompt
      const prompt = this.createGPTPrompt(question, field);
      
      try {
        const response = await this.gptService.generateAnswer(question, prompt);
        return response.trim();
      } catch (error) {
        console.error('Error getting GPT answer:', error);
        return null;
      }
    }

    // Create context-aware prompt for GPT
    createGPTPrompt(question, field) {
      const fieldType = this.getFieldType(field);
      const fieldName = field.name || '';
      
      let context = '';
      let options = '';
      
      // Add profile context
      if (this.profile.visaStatus) {
        context += `\nVisa Status: ${this.profile.visaStatus}`;
      }
      if (this.profile.sponsorship) {
        context += `\nSponsorship: ${this.profile.sponsorship}`;
      }
      if (this.profile.workAuthorization) {
        context += `\nWork Authorization: ${this.profile.workAuthorization}`;
      }
      
      // Special handling for international students
      if (this.profile.visaStatus === 'student' || this.profile.visaStatus === 'visa') {
        context += `\nIMPORTANT: You are an international student. International students typically DO NOT require visa sponsorship for internships and some entry-level positions. Only select "Yes" for sponsorship if the question specifically asks about H1B sponsorship for full-time positions.`;
      }
      
      // Add available options for select fields
      if (fieldType === 'select') {
        const selectOptions = Array.from(field.options).map(opt => `${opt.text} (${opt.value})`);
        options = `\nAvailable Options: ${selectOptions.join(', ')}`;
      }
      
      // Add radio button options
      if (fieldType === 'radio') {
        const radios = document.querySelectorAll(`input[name="${field.name}"][type="radio"]`);
        const radioOptions = Array.from(radios).map(radio => {
          const label = this.findFieldLabel(radio) || radio.value;
          return `${label} (${radio.value})`;
        });
        options = `\nAvailable Options: ${radioOptions.join(', ')}`;
      }
      
      const prompt = `You are filling out a job application form. Please provide a concise, professional answer for the following question.

Question: "${question}"
Field Type: ${fieldType}
Field Name: ${fieldName}${options}

Your Profile Information:${context}

Instructions:
- Provide a short, direct answer (1-2 sentences max for text fields)
- For select/radio fields: Choose the BEST matching option from the available choices
- For checkbox fields: Answer "Yes" or "No" based on the question
- Be professional and positive
- For sponsorship questions: International students typically don't need sponsorship for internships
- For demographic questions: Use "Prefer not to say" if uncomfortable
- For salary questions: Use "Negotiable" or "Market rate" if unsure
- If no good option exists, choose the closest match or "Other" if available

Answer:`;
      
      return prompt;
    }

    // Handle file uploads
    async handleFileUploads() {
      console.log('Handling file uploads...');
      
      const fileInput = this.findFileUploadField();
      if (!fileInput) {
        console.log('No file upload field found');
        return;
      }
      
      if (this.resumes.length === 0) {
        console.log('No resumes available');
        return;
      }
      
      // Extract job description for resume selection
      const jobDescription = this.extractJobDescription();
      
      // Select best resume
      const selectedResume = this.selectResume(jobDescription, this.resumes);
      
      if (selectedResume) {
        const success = this.uploadFile(fileInput, selectedResume.file);
        if (success) {
          console.log(`✅ Uploaded resume: ${selectedResume.name}`);
          // Wait 3 seconds before submitting
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.log('❌ Failed to upload resume');
        }
      }
    }

    // Extract job description from page
    extractJobDescription() {
      // Try to find job description in common locations
      const selectors = [
        '.job-description',
        '.description',
        '[data-testid*="description"]',
        '.content',
        'main',
        'article'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent;
        }
      }
      
      return document.body.textContent;
    }

    // Find field label
    findFieldLabel(field) {
      // Check if label has 'for' attribute
      if (field.id) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        if (label) return label.textContent.trim();
      }
      
      // Check if input is inside label
      const parentLabel = field.closest('label');
      if (parentLabel) return parentLabel.textContent.trim();
      
      // Check for aria-label
      if (field.getAttribute('aria-label')) {
        return field.getAttribute('aria-label');
      }
      
      // Check for title attribute
      if (field.title) {
        return field.title;
      }
      
      return null;
    }

    // Try to submit or navigate to next page
    async trySubmitOrNavigate() {
      console.log('Looking for submit button or next page...');
      
      // Look for submit button
      const submitButton = this.findSubmitButton();
      if (submitButton) {
        console.log('Found submit button, clicking...');
        submitButton.click();
        return;
      }
      
      // Look for next/continue buttons
      const nextSelectors = [
        'button:contains("Next")',
        'button:contains("Continue")',
        'button:contains("Save")',
        'a:contains("Next")',
        'a:contains("Continue")'
      ];
      
      for (const selector of nextSelectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          console.log('Found next/continue button, clicking...');
          element.click();
          return;
        }
      }
      
      console.log('No submit or next button found');
    }

    // Stop the auto apply process
    stop() {
      this.isRunning = false;
      console.log('Auto apply process stopped');
    }

    // Helper: get demographic key from question/label
    getDemographicKey(question) {
      const q = question.toLowerCase();
      if (q.includes('gender') || q.includes('sex')) return 'gender';
      if (q.includes('age')) return 'age';
      if (q.includes('race') || q.includes('ethnic')) return 'race';
      if (q.includes('veteran') || q.includes('military')) return 'veteran';
      if (q.includes('disab')) return 'disability';
      if (q.includes('lgbt')) return 'lgbtq';
      if (q.includes('minority')) return 'minority';
      if (q.includes('pronoun')) return 'pronoun';
      if (q.includes('citizen')) return 'citizenship';
      if (q.includes('hispanic')) return 'hispanic';
      if (q.includes('origin')) return 'origin';
      return null;
    }

    // Test GPT connection and log result
    async testGPTConnection() {
      if (!this.gptService) return;
      const testQ = 'What is a dog?';
      try {
        const answer = await this.gptService.generateAnswer(testQ);
        console.log(`[GPT TEST] Q: ${testQ}\nA: ${answer}`);
      } catch (e) {
        console.error('[GPT TEST] Error:', e);
      }
    }

    // Helper: get hardcoded answer for a question
    getHardcodedAnswer(question) {
      const q = question.toLowerCase();
      for (const entry of this.hardcodedAnswers) {
        if (entry.keywords.some(kw => q.includes(kw))) {
          return entry.answer;
        }
      }
      return null;
    }

    // Helper: fuzzy match answer to options
    fuzzyMatchOption(options, answer) {
      if (!answer) return null;
      const answerLower = answer.toLowerCase();
      // 1. Exact match
      let match = options.find(opt => opt.toLowerCase() === answerLower);
      if (match) return match;
      // 2. Substring match
      match = options.find(opt => answerLower.includes(opt.toLowerCase()) || opt.toLowerCase().includes(answerLower));
      if (match) return match;
      // 3. First option containing any word from answer
      const answerWords = answerLower.split(/\s+/);
      match = options.find(opt => answerWords.some(word => opt.toLowerCase().includes(word)));
      if (match) return match;
      // 4. Fallback: first option
      return options[0] || null;
    }

    // Helper: check if all required fields are filled, then submit
    submitIfAllRequiredFilled() {
      const requiredFields = this.findRequiredFields();
      const unfilled = requiredFields.filter(f => !f.value || (f.type === 'checkbox' && !f.checked));
      if (unfilled.length === 0) {
        console.log('All required fields filled. Submitting...');
        this.trySubmitOrNavigate();
      } else {
        console.warn('Some required fields are still unfilled:', unfilled);
      }
    }
  }

  // Initialize and start the auto applicator when the script loads
  let autoApplicator = null;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutoApply') {
      if (!autoApplicator) {
        autoApplicator = new AutoJobApplicator();
      }
      
      autoApplicator.init().then((success) => {
        if (success) {
          autoApplicator.start();
          sendResponse({status: 'started'});
        } else {
          sendResponse({status: 'error', message: 'Failed to initialize'});
        }
      });
      
      return true; // Keep the message channel open for async response
    }
  });

  console.log('Auto Job Apply content script loaded');
} 