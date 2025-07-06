// Handle profile saving
document.getElementById('saveProfileBtn').addEventListener('click', function(e) {
  e.preventDefault();
  
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Save profile data
  chrome.storage.local.set({profile: data}, () => {
    showStatus('Profile saved successfully!', 'success');
  });
});

// Handle opening options page for resume management
document.getElementById('openOptionsBtn').addEventListener('click', function(e) {
  e.preventDefault();
  
  // First save the current profile data
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  chrome.storage.local.set({profile: data}, () => {
    // Then open the options page
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        showStatus('Error opening options page: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('Profile saved and opening resume manager...', 'success');
        setTimeout(() => window.close(), 1000);
      }
    });
  });
});

// Show resume count
function updateResumeCount() {
  chrome.storage.local.get({resumes: []}, (result) => {
    const count = result.resumes.length;
    const countDiv = document.getElementById('resumeCount');
    if (count === 0) {
      countDiv.textContent = 'No resumes uploaded yet';
    } else if (count === 1) {
      countDiv.textContent = '1 resume uploaded';
    } else {
      countDiv.textContent = `${count} resumes uploaded`;
    }
  });
}

document.getElementById('runAutoApply').addEventListener('click', function(e) {
  e.preventDefault(); // Prevent any default behavior
  
  // First save the current profile data
  const form = document.getElementById('profileForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  chrome.storage.local.set({profile: data}, () => {
    const button = this;
    const originalText = button.textContent;
    
    button.textContent = 'Starting...';
    button.disabled = true;
    
    chrome.runtime.sendMessage({action: 'startAutoApply'}, (response) => {
      if (response && response.status === 'started') {
        showStatus('Profile saved and auto apply started! Check the console for progress.', 'success');
        setTimeout(() => window.close(), 2000);
      } else {
        showStatus('Error: ' + (response?.message || 'Unknown error'), 'error');
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = type;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}

document.getElementById('testGptKeyBtn').addEventListener('click', async function() {
  const keyInput = document.querySelector('[name="gptApiKey"]');
  const statusEl = document.getElementById('gpt-status');
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    statusEl.textContent = '❌ Not Connected';
    statusEl.style.color = 'red';
    return;
  }
  this.disabled = true;
  const originalText = this.textContent;
  this.textContent = 'Testing...';
  statusEl.textContent = '';
  try {
    const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'Llama-4-Maverick-17B-128E-Instruct',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
    });
    if (!response.ok) throw new Error('Invalid key or network error');
    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      statusEl.textContent = '✅ Connected';
      statusEl.style.color = 'green';
    } else {
      statusEl.textContent = '❌ Not Connected';
      statusEl.style.color = 'red';
    }
  } catch (e) {
    statusEl.textContent = '❌ Not Connected';
    statusEl.style.color = 'red';
  } finally {
    this.disabled = false;
    this.textContent = originalText;
  }
});

window.onload = function() {
  // Load profile data
  chrome.storage.local.get('profile', (result) => {
    if (result.profile) {
      for (const [key, value] of Object.entries(result.profile)) {
        const input = document.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
      }
    }
  });
  
  // Load GPT API key and show connection status
  chrome.storage.local.get('gptApiKey', (result) => {
    const statusEl = document.getElementById('gpt-status');
    if (result.gptApiKey && result.gptApiKey.trim() !== '') {
      const input = document.querySelector('[name="gptApiKey"]');
      if (input) input.value = result.gptApiKey;
      statusEl.textContent = '✅ GPT Connected';
      statusEl.style.color = 'green';
    } else {
      statusEl.textContent = '❌ GPT Not Connected';
      statusEl.style.color = 'red';
    }
  });
  
  // Update resume count
  updateResumeCount();
}; 